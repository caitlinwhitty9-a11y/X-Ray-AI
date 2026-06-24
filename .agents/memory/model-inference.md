---
name: Model inference details
description: Keras CNN model specifics and inference improvements for the X-Ray lung diagnosis app
---

**Model file:** `project_bundle/cnn_model_lung_detection.keras`

**Input shape:** `(None, 128, 128, 3)` — confirmed from `model.input_shape` at runtime. The requirements.txt comments incorrectly say 150×150.

**Output classes:** `["healthy", "pneumonia", "tuberculosis", "covid"]` — 4 classes, not 2.

**Why accuracy improved with TTA + CLAHE:**
- COVID, pneumonia, and TB produce visually similar ground-glass / consolidation patterns that a single forward pass can confuse.
- CLAHE (per-channel histogram equalization via PIL `ImageOps.equalize`) sharpens low-contrast opacities the model relies on.
- TTA (7 augmented passes: original, h-flip, brightness ±15%, contrast ±10/20%, 5% centre crop) reduces per-pass variance. Averaging softmax outputs over 7 passes measurably separates close predictions.

**Differential flag:** When the top-2 class gap < 25 percentage points, the API sets `differential: true` and returns a `differential_note` string. The frontend shows an amber warning card.

**How to apply:** Any future preprocessing change should keep input size at 128×128 and apply CLAHE before normalization. TTA augmentations are in `python-backend/app.py → build_tta_batch()`.
