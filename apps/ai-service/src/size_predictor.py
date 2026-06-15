"""
Size prediction model — maps body measurements to brand-specific sizes.
Uses scikit-learn trained on brand size charts.
"""
import os
import json
import numpy as np
from typing import Literal

try:
    import joblib
    from sklearn.neighbors import KNeighborsClassifier

    _MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "size_model.pkl")
    _model: KNeighborsClassifier | None = (
        joblib.load(_MODEL_PATH) if os.path.exists(_MODEL_PATH) else None
    )
except ImportError:
    _model = None


# Standard Nepali/South Asian brand size chart fallback (chest measurements in cm)
_SIZE_CHART = {
    "tops": [
        ("XS", 76, 80),
        ("S",  81, 86),
        ("M",  87, 92),
        ("L",  93, 98),
        ("XL", 99, 104),
        ("XXL", 105, 112),
    ],
    "bottoms": [
        ("XS", 60, 64),
        ("S",  65, 69),
        ("M",  70, 74),
        ("L",  75, 80),
        ("XL", 81, 86),
        ("XXL", 87, 94),
    ],
}


def predict_size(
    chest_cm: float | None,
    waist_cm: float | None,
    hips_cm: float | None,
    garment_type: Literal["tops", "bottoms", "dress"] = "tops",
) -> dict:
    """
    Predict clothing size from body measurements.
    Falls back to size chart lookup when ML model is unavailable.
    Returns: {size, confidence, reasoning}
    """
    if _model is not None and all(v is not None for v in [chest_cm, waist_cm, hips_cm]):
        features = np.array([[chest_cm, waist_cm, hips_cm]])
        size = _model.predict(features)[0]
        proba = _model.predict_proba(features).max()
        return {
            "size": size,
            "confidence": round(float(proba), 2),
            "reasoning": f"ML model prediction based on {garment_type} training data",
        }

    # Rule-based fallback using size chart
    measurement = chest_cm if garment_type in ("tops", "dress") else waist_cm
    chart_key = "tops" if garment_type in ("tops", "dress") else "bottoms"

    if measurement is None:
        return {"size": "M", "confidence": 0.3, "reasoning": "No measurements provided, defaulting to M"}

    for size, low, high in _SIZE_CHART.get(chart_key, _SIZE_CHART["tops"]):
        if low <= measurement <= high:
            return {
                "size": size,
                "confidence": 0.75,
                "reasoning": f"{garment_type.title()} measurement {measurement}cm falls in {size} range ({low}–{high}cm)",
            }

    # Out of range — suggest closest
    if measurement < _SIZE_CHART[chart_key][0][1]:
        size = _SIZE_CHART[chart_key][0][0]
    else:
        size = _SIZE_CHART[chart_key][-1][0]

    return {
        "size": size,
        "confidence": 0.6,
        "reasoning": f"Measurement {measurement}cm is outside standard chart, closest size is {size}",
    }
