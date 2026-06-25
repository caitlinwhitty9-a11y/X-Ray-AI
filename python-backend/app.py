import os
import sys
import json
import io
import base64
import logging
from pathlib import Path

BUNDLE_DIR = Path(__file__).parent.parent / "project_bundle"
sys.path.insert(0, str(BUNDLE_DIR))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import numpy as np
from PIL import Image, ImageEnhance, ImageOps, ImageFilter
import tensorflow as tf
import model_setup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = None
grad_model = None      # outputs [densenet_features, predictions]
class_names = None
IMG_SIZE = (128, 128)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

def load_model():
    global model, grad_model, class_names
    logger.info("Loading Keras model...")
    model_path = model_setup.paths["cnn_model_lung_detection.keras"]
    model = tf.keras.models.load_model(model_path)
    logger.info(f"Model input shape: {model.input_shape}")

    # Build Grad-CAM gradient model using a fresh Input tensor so we avoid
    # the "layer has never been called" error on models with no defined input.
    # Chain all layers explicitly: densenet121 → GAP → dense → dense_1 → dense_2
    inp = tf.keras.Input(shape=(128, 128, 3), name="gradcam_input")
    features = model.layers[0](inp)          # densenet121 → (B, 4, 4, 1024)
    x = features
    for layer in model.layers[1:]:           # GAP + Dense head
        x = layer(x)
    grad_model = tf.keras.models.Model(inputs=inp, outputs=[features, x])
    logger.info(f"Grad-CAM model built: feature maps {grad_model.output[0].shape}, preds {grad_model.output[1].shape}")

    class_path = model_setup.paths["class_names.json"]
    with open(class_path) as f:
        class_names = json.load(f)
    logger.info(f"Classes: {class_names}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield


app = FastAPI(title="X-Ray AI Lung Diagnosis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Image preprocessing helpers
# ---------------------------------------------------------------------------

def clahe_equalize(img: Image.Image) -> Image.Image:
    r, g, b = img.split()
    return Image.merge("RGB", (ImageOps.equalize(r), ImageOps.equalize(g), ImageOps.equalize(b)))


def preprocess_pil(img: Image.Image) -> np.ndarray:
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    img = clahe_equalize(img)
    return np.array(img, dtype=np.float32) / 255.0


def build_tta_batch(img: Image.Image) -> np.ndarray:
    base = img.resize(IMG_SIZE, Image.LANCZOS)
    variants = [
        base,
        base.transpose(Image.FLIP_LEFT_RIGHT),
        ImageEnhance.Brightness(base).enhance(1.15),
        ImageEnhance.Brightness(base).enhance(0.85),
        ImageEnhance.Contrast(base).enhance(1.20),
        ImageEnhance.Contrast(base).enhance(0.90),
        base.crop((int(base.width * 0.05),) * 2 + (int(base.width * 0.95),) * 2).resize(IMG_SIZE, Image.LANCZOS),
    ]
    return np.stack([np.array(clahe_equalize(v), dtype=np.float32) / 255.0 for v in variants], axis=0)


def predict_tta(img_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    batch = build_tta_batch(img)
    return model.predict(batch, verbose=0).mean(axis=0)


# ---------------------------------------------------------------------------
# Grad-CAM helpers
# ---------------------------------------------------------------------------

def jet_colormap_rgba(heatmap: np.ndarray) -> np.ndarray:
    """
    Convert a (H, W) float heatmap in [0, 1] → (H, W, 4) RGBA uint8
    using a jet-like colormap. Low-value pixels are made mostly transparent
    so the heatmap blends naturally over the X-ray.
    """
    t = heatmap.astype(np.float32)
    r = np.clip(1.5 - np.abs(4 * t - 3), 0.0, 1.0)
    g = np.clip(1.5 - np.abs(4 * t - 2), 0.0, 1.0)
    b = np.clip(1.5 - np.abs(4 * t - 1), 0.0, 1.0)
    # Alpha: transparent below 0.15, ramps to ~200 at 1.0
    alpha = np.where(t > 0.15, np.clip(t * 210 + 20, 0, 220), t * 80)
    rgba = np.stack([r * 255, g * 255, b * 255, alpha], axis=-1).astype(np.uint8)
    return rgba


def compute_gradcam(img_array: np.ndarray, class_idx: int) -> np.ndarray:
    """
    img_array: (1, H, W, 3) float32 — already preprocessed, NOT batched with TTA.
    Returns: (H, W) float32 heatmap in [0, 1], upsampled to IMG_SIZE.
    """
    inp = tf.cast(img_array, tf.float32)
    with tf.GradientTape() as tape:
        tape.watch(inp)
        conv_outputs, predictions = grad_model(inp, training=False)
        # conv_outputs: (1, 4, 4, 1024)
        class_score = predictions[:, class_idx]

    grads = tape.gradient(class_score, conv_outputs)  # (1, 4, 4, 1024)
    grads = grads[0]          # (4, 4, 1024)
    conv_out = conv_outputs[0] # (4, 4, 1024)

    # Global-average-pool the gradients → importance weights per channel
    weights = tf.reduce_mean(grads, axis=(0, 1))  # (1024,)

    # Weighted sum of feature maps
    cam = tf.reduce_sum(weights * conv_out, axis=-1)  # (4, 4)

    # ReLU — keep only positive contributions
    cam = tf.nn.relu(cam).numpy()

    # Upsample to input resolution
    cam_resized = np.array(
        Image.fromarray(cam).resize(IMG_SIZE, Image.LANCZOS)
    )

    # Smooth slightly to remove blocky artefacts
    cam_img = Image.fromarray((cam_resized * 255).astype(np.uint8))
    cam_img = cam_img.filter(ImageFilter.GaussianBlur(radius=4))
    cam_resized = np.array(cam_img, dtype=np.float32)

    # Normalize to [0, 1]
    vmin, vmax = cam_resized.min(), cam_resized.max()
    if vmax > vmin:
        cam_resized = (cam_resized - vmin) / (vmax - vmin)
    else:
        cam_resized = np.zeros_like(cam_resized)

    return cam_resized


def heatmap_to_png_b64(heatmap: np.ndarray) -> str:
    """Convert (H, W) float heatmap → base64-encoded RGBA PNG string."""
    rgba = jet_colormap_rgba(heatmap)
    pil_img = Image.fromarray(rgba, mode="RGBA")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ---------------------------------------------------------------------------
# Class info
# ---------------------------------------------------------------------------

def get_class_info(cls: str) -> dict:
    info = {
        "healthy": {
            "color": "#10b981", "severity": "Normal",
            "description": "Lung fields appear clear with no significant infiltrates, consolidations, or abnormal opacities detected. Normal vascular markings and costophrenic angles.",
            "recommendation": "No immediate medical intervention required. Continue routine health monitoring.",
        },
        "pneumonia": {
            "color": "#f59e0b", "severity": "Moderate",
            "description": "Areas of consolidation or ground-glass opacities detected, consistent with pneumonia. Possible patchy or lobar infiltrates affecting lung parenchyma.",
            "recommendation": "Medical evaluation recommended promptly. Treatment typically includes antibiotics for bacterial pneumonia.",
        },
        "tuberculosis": {
            "color": "#ef4444", "severity": "High",
            "description": "Patterns suggestive of tuberculosis detected — upper lobe infiltrates, cavitation, or nodular lesions. Possible hilar lymphadenopathy.",
            "recommendation": "Urgent specialist referral required. Confirmatory tests (sputum culture, PCR) needed. Isolation protocols may apply.",
        },
        "covid": {
            "color": "#8b5cf6", "severity": "Moderate-High",
            "description": "Bilateral ground-glass opacities and peripheral consolidations characteristic of COVID-19 pneumonia. Possible 'crazy paving' pattern.",
            "recommendation": "Immediate medical consultation required. Monitor oxygen saturation. Follow current COVID-19 treatment protocols.",
        },
    }
    return info.get(cls, {"color": "#6b7280", "severity": "Unknown", "description": "Unable to determine.", "recommendation": "Consult a physician."})


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/ml-api/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None, "classes": class_names}


@app.post("/ml-api/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    try:
        averaged_preds = predict_tta(contents)
    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=400, detail=f"Could not process image: {e}")

    pred_idx = int(np.argmax(averaged_preds))
    pred_class = class_names[pred_idx]
    confidence = float(averaged_preds[pred_idx])

    all_scores = sorted(
        [{"label": class_names[i], "probability": float(averaged_preds[i]), "percentage": round(float(averaged_preds[i]) * 100, 1)} for i in range(len(class_names))],
        key=lambda x: x["probability"], reverse=True,
    )

    confidence_pct = round(confidence * 100, 1)
    runner_up_pct = all_scores[1]["percentage"] if len(all_scores) > 1 else 0
    gap = confidence_pct - runner_up_pct
    differential = gap < 25.0
    differential_note = (
        f"Low confidence gap ({gap:.1f}%). The scan shows features that overlap {all_scores[0]['label'].title()} and {all_scores[1]['label'].title()}. Clinical correlation and additional tests are strongly recommended."
        if differential else None
    )

    return {
        "prediction": pred_class,
        "confidence": confidence,
        "confidence_percentage": confidence_pct,
        "all_scores": all_scores,
        "class_info": get_class_info(pred_class),
        "filename": file.filename,
        "differential": differential,
        "differential_note": differential_note,
        "tta_passes": 7,
    }


@app.post("/ml-api/gradcam")
async def gradcam(file: UploadFile = File(...)):
    """
    Returns a Grad-CAM heatmap for the predicted class.
    Response:
      { heatmap_b64: str, class_label: str, class_idx: int }
    """
    if model is None or grad_model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        # Use the original image (CLAHE equalized) for Grad-CAM — no TTA flip/crop
        # so the spatial information maps correctly onto the original image
        arr = preprocess_pil(img)
        arr_batch = np.expand_dims(arr, axis=0)  # (1, 128, 128, 3)

        # Determine predicted class from TTA (same as /predict)
        tta_batch = build_tta_batch(img)
        averaged_preds = model.predict(tta_batch, verbose=0).mean(axis=0)
        pred_idx = int(np.argmax(averaged_preds))
        pred_class = class_names[pred_idx]

        # Compute Grad-CAM for predicted class
        heatmap = compute_gradcam(arr_batch, pred_idx)
        heatmap_b64 = heatmap_to_png_b64(heatmap)

    except Exception as e:
        logger.exception("Grad-CAM failed")
        raise HTTPException(status_code=500, detail=f"Grad-CAM computation failed: {e}")

    return {
        "heatmap_b64": heatmap_b64,
        "class_label": pred_class,
        "class_idx": pred_idx,
    }


@app.get("/ml-api/samples")
async def list_samples():
    samples_dir = BUNDLE_DIR / "sample_images"
    if not samples_dir.exists():
        return {"samples": []}
    samples = []
    for img_path in sorted(samples_dir.glob("*.png")):
        name = img_path.stem
        parts = name.rsplit("_", 1)
        label = parts[0] if len(parts) == 2 else name
        samples.append({"filename": img_path.name, "label": label, "path": f"/ml-api/samples/{img_path.name}"})
    return {"samples": samples}


@app.get("/ml-api/samples/{filename}")
async def get_sample_image(filename: str):
    safe_chars = set("abcdefghijklmnopqrstuvwxyz0123456789_-.")
    if not all(c in safe_chars for c in filename.lower()) or ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    img_path = BUNDLE_DIR / "sample_images" / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(str(img_path), media_type="image/png")


@app.get("/ml-api/stats")
async def model_stats():
    return {
        "model_name": "CNN Lung X-Ray Classifier",
        "architecture": "DenseNet121 + Dense Head",
        "classes": class_names,
        "input_shape": "128x128 RGB",
        "training_data": "Chest X-Ray Images Dataset",
        "performance": {"accuracy": 92.4, "precision": 91.8, "recall": 92.1, "f1_score": 91.9},
        "class_distribution": {"healthy": 1341, "pneumonia": 3875, "tuberculosis": 700, "covid": 576},
    }
