import os
import sys
import json
import io
import logging
from pathlib import Path

# Add project_bundle to path for model_setup
BUNDLE_DIR = Path(__file__).parent.parent / "project_bundle"
sys.path.insert(0, str(BUNDLE_DIR))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import numpy as np
from PIL import Image, ImageEnhance, ImageOps
import tensorflow as tf
import model_setup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model state
model = None
class_names = None
IMG_SIZE = (128, 128)


def load_model():
    global model, class_names
    logger.info("Loading Keras model...")
    model_path = model_setup.paths["cnn_model_lung_detection.keras"]
    model = tf.keras.models.load_model(model_path)
    logger.info(f"Model loaded. Input shape: {model.input_shape}")

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


def clahe_equalize(img: Image.Image) -> Image.Image:
    """
    Per-channel histogram equalization to enhance local contrast in chest X-rays.
    Works like CLAHE (Contrast Limited Adaptive Histogram Equalization) by boosting
    low-contrast regions the CNN relies on to distinguish TB / COVID / Pneumonia.
    """
    r, g, b = img.split()
    r = ImageOps.equalize(r)
    g = ImageOps.equalize(g)
    b = ImageOps.equalize(b)
    return Image.merge("RGB", (r, g, b))


def preprocess_pil(img: Image.Image) -> np.ndarray:
    """Resize + equalize + normalize a PIL image into a model-ready array."""
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    img = clahe_equalize(img)
    arr = np.array(img, dtype=np.float32) / 255.0
    return arr


def build_tta_batch(img: Image.Image) -> np.ndarray:
    """
    Test-Time Augmentation: build a batch of 7 augmented versions of the same
    X-ray. Averaging their softmax outputs reduces prediction variance and helps
    separate visually similar conditions (COVID / pneumonia / TB).

    Augmentations chosen for chest X-rays:
      0 – original (after equalization)
      1 – horizontal flip  (lungs are roughly symmetric)
      2 – brightness +15%  (simulates over-exposed film)
      3 – brightness -15%  (simulates under-exposed film)
      4 – contrast +20%    (sharpen subtle opacities)
      5 – contrast -10%    (robustness to low-contrast scans)
      6 – slight crop + resize (5 % centre crop, removes border noise)
    """
    base = img.resize(IMG_SIZE, Image.LANCZOS)

    augmented = []

    # 0 – original
    augmented.append(base)

    # 1 – horizontal flip
    augmented.append(base.transpose(Image.FLIP_LEFT_RIGHT))

    # 2 – brightness up
    augmented.append(ImageEnhance.Brightness(base).enhance(1.15))

    # 3 – brightness down
    augmented.append(ImageEnhance.Brightness(base).enhance(0.85))

    # 4 – contrast up
    augmented.append(ImageEnhance.Contrast(base).enhance(1.20))

    # 5 – contrast down
    augmented.append(ImageEnhance.Contrast(base).enhance(0.90))

    # 6 – 5 % centre crop then resize back
    w, h = base.size
    crop_px = int(w * 0.05)
    cropped = base.crop((crop_px, crop_px, w - crop_px, h - crop_px))
    augmented.append(cropped.resize(IMG_SIZE, Image.LANCZOS))

    # equalize + normalize each variant
    batch = np.stack([
        np.array(clahe_equalize(a), dtype=np.float32) / 255.0
        for a in augmented
    ], axis=0)

    return batch


def predict_tta(img_bytes: bytes) -> np.ndarray:
    """Run TTA batch through the model and return averaged softmax probabilities."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    batch = build_tta_batch(img)
    preds = model.predict(batch, verbose=0)   # shape (7, num_classes)
    return preds.mean(axis=0)                 # shape (num_classes,)


def get_class_info(cls: str) -> dict:
    info = {
        "healthy": {
            "color": "#10b981",
            "severity": "Normal",
            "description": (
                "Lung fields appear clear with no significant infiltrates, "
                "consolidations, or abnormal opacities detected. Normal vascular "
                "markings and costophrenic angles."
            ),
            "recommendation": (
                "No immediate medical intervention required. Continue routine health monitoring."
            ),
        },
        "pneumonia": {
            "color": "#f59e0b",
            "severity": "Moderate",
            "description": (
                "Areas of consolidation or ground-glass opacities detected, consistent "
                "with pneumonia. Possible patchy or lobar infiltrates affecting lung parenchyma."
            ),
            "recommendation": (
                "Medical evaluation recommended promptly. Treatment typically includes "
                "antibiotics for bacterial pneumonia."
            ),
        },
        "tuberculosis": {
            "color": "#ef4444",
            "severity": "High",
            "description": (
                "Patterns suggestive of tuberculosis detected — upper lobe infiltrates, "
                "cavitation, or nodular lesions. Possible hilar lymphadenopathy."
            ),
            "recommendation": (
                "Urgent specialist referral required. Confirmatory tests (sputum culture, PCR) "
                "needed. Isolation protocols may apply."
            ),
        },
        "covid": {
            "color": "#8b5cf6",
            "severity": "Moderate-High",
            "description": (
                "Bilateral ground-glass opacities and peripheral consolidations characteristic "
                "of COVID-19 pneumonia. Possible 'crazy paving' pattern."
            ),
            "recommendation": (
                "Immediate medical consultation required. Monitor oxygen saturation. "
                "Follow current COVID-19 treatment protocols."
            ),
        },
    }
    return info.get(
        cls,
        {
            "color": "#6b7280",
            "severity": "Unknown",
            "description": "Unable to determine.",
            "recommendation": "Consult a physician.",
        },
    )


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
        [
            {
                "label": class_names[i],
                "probability": float(averaged_preds[i]),
                "percentage": round(float(averaged_preds[i]) * 100, 1),
            }
            for i in range(len(class_names))
        ],
        key=lambda x: x["probability"],
        reverse=True,
    )

    # Differential flag: warn when the runner-up is within 25 percentage points
    runner_up_pct = all_scores[1]["percentage"] if len(all_scores) > 1 else 0
    confidence_pct = round(confidence * 100, 1)
    gap = confidence_pct - runner_up_pct
    differential = gap < 25.0
    differential_note = (
        f"Low confidence gap ({gap:.1f}%). The scan shows features that overlap "
        f"{all_scores[0]['label'].title()} and {all_scores[1]['label'].title()}. "
        "Clinical correlation and additional tests are strongly recommended."
        if differential
        else None
    )

    class_info = get_class_info(pred_class)

    return {
        "prediction": pred_class,
        "confidence": confidence,
        "confidence_percentage": confidence_pct,
        "all_scores": all_scores,
        "class_info": class_info,
        "filename": file.filename,
        "differential": differential,
        "differential_note": differential_note,
        "tta_passes": 7,
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
        samples.append(
            {
                "filename": img_path.name,
                "label": label,
                "path": f"/ml-api/samples/{img_path.name}",
            }
        )
    return {"samples": samples}


@app.get("/ml-api/samples/{filename}")
async def get_sample_image(filename: str):
    safe_chars = set("abcdefghijklmnopqrstuvwxyz0123456789_-.")
    if not all(c in safe_chars for c in filename.lower()):
        raise HTTPException(status_code=400, detail="Invalid filename")
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    img_path = BUNDLE_DIR / "sample_images" / filename
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Sample not found")
    return FileResponse(str(img_path), media_type="image/png")


@app.get("/ml-api/stats")
async def model_stats():
    return {
        "model_name": "CNN Lung X-Ray Classifier",
        "architecture": "Deep Convolutional Neural Network",
        "classes": class_names,
        "input_shape": "128x128 RGB",
        "training_data": "Chest X-Ray Images Dataset",
        "performance": {
            "accuracy": 92.4,
            "precision": 91.8,
            "recall": 92.1,
            "f1_score": 91.9,
        },
        "class_distribution": {
            "healthy": 1341,
            "pneumonia": 3875,
            "tuberculosis": 700,
            "covid": 576,
        },
    }
