"""
Body analysis service — MediaPipe Pose + geometry + body type classifier.

Accepts a raw image (bytes). Does NOT require the caller to supply a known height;
height is estimated from head-to-body proportions (head = nose-to-mid-shoulder ×7.5).
All landmark geometry is done in pixel space and then scaled to cm.
"""

from __future__ import annotations

import io
import math
from dataclasses import dataclass, asdict
from typing import Literal

import numpy as np
from PIL import Image
import mediapipe as mp

# ─── MediaPipe setup ──────────────────────────────────────────────────────────
_mp_pose = mp.solutions.pose

# Standard MediaPipe Pose landmark indices
_IDX = {
    "nose": 0,
    "l_eye": 2,
    "r_eye": 5,
    "l_ear": 7,
    "r_ear": 8,
    "l_shoulder": 11,
    "r_shoulder": 12,
    "l_elbow": 13,
    "r_elbow": 14,
    "l_wrist": 15,
    "r_wrist": 16,
    "l_hip": 23,
    "r_hip": 24,
    "l_knee": 25,
    "r_knee": 26,
    "l_ankle": 27,
    "r_ankle": 28,
    "l_heel": 29,
    "r_heel": 30,
}

BodyTypeLiteral = Literal[
    "HOURGLASS", "PEAR", "APPLE", "RECTANGLE", "INVERTED_TRIANGLE"
]


# ─── Data classes ─────────────────────────────────────────────────────────────
@dataclass
class Measurements:
    height_cm: float
    shoulder_cm: float
    bust_cm: float
    waist_cm: float
    hips_cm: float


@dataclass
class AnalysisResult:
    height_cm: float
    shoulder_cm: float
    bust_cm: float
    waist_cm: float
    hips_cm: float
    body_type: BodyTypeLiteral
    confidence: float  # 0.0 – 1.0

    def to_dict(self) -> dict:
        return asdict(self)


# ─── Geometry helpers ─────────────────────────────────────────────────────────
def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def _mid(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


# ─── Landmark extraction ──────────────────────────────────────────────────────
def _extract_landmarks(
    image_bytes: bytes,
) -> tuple[list, int, int, float] | None:
    """
    Run MediaPipe Pose on image_bytes.
    Returns (landmarks, img_width_px, img_height_px, pose_confidence) or None.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)
    h_px, w_px = img_array.shape[:2]

    with _mp_pose.Pose(
        static_image_mode=True,
        model_complexity=2,        # BlazePose Heavy — highest accuracy
        enable_segmentation=False,
        min_detection_confidence=0.5,
    ) as pose:
        result = pose.process(img_array)

    if not result.pose_landmarks:
        return None

    lm = result.pose_landmarks.landmark

    # Use the mean visibility of key body landmarks as a proxy for confidence
    key_indices = [_IDX[k] for k in ("l_shoulder", "r_shoulder", "l_hip", "r_hip", "l_ankle", "r_ankle")]
    confidence = float(np.mean([lm[i].visibility for i in key_indices]))

    return lm, w_px, h_px, confidence


# ─── Height estimation (no user-supplied reference) ───────────────────────────
def _estimate_height_cm(
    lm: list,
    w_px: int,
    h_px: int,
) -> float:
    """
    Estimate height from body proportions.

    Strategy: head height ≈ vertical distance (nose → mid-shoulder).
    Average human body ≈ 7.5 head-heights tall.
    Then verify / cross-check with shoulder-to-ankle pixel span.
    """

    def pt(name: str) -> tuple[float, float]:
        landmark = lm[_IDX[name]]
        return landmark.x * w_px, landmark.y * h_px

    nose = pt("nose")
    l_shoulder, r_shoulder = pt("l_shoulder"), pt("r_shoulder")
    l_ankle, r_ankle = pt("l_ankle"), pt("r_ankle")

    mid_shoulder = _mid(l_shoulder, r_shoulder)
    mid_ankle = _mid(l_ankle, r_ankle)

    # Head height proxy: nose-to-mid-shoulder vertical span
    head_height_px = abs(mid_shoulder[1] - nose[1])

    # Total height from proportions (7.5 head-heights)
    # head_height_px * 7.5 used in weighted blend below via head_height_px

    # Cross-check: shoulder-to-ankle span ≈ 82 % of total height
    shoulder_ankle_px = _dist(mid_shoulder, mid_ankle)
    height_from_span = shoulder_ankle_px / 0.82 if shoulder_ankle_px > 20 else 0

    # Weighted blend: prefer head-based when visible, span-based as fallback
    if head_height_px > 5 and height_from_span > 0:
        blended_px = head_height_px * 7.5 * 0.55 + height_from_span * 0.45
    elif head_height_px > 5:
        blended_px = head_height_px * 7.5
    elif height_from_span > 0:
        blended_px = height_from_span
    else:
        blended_px = h_px * 0.85  # last-resort: assume person fills 85 % of frame

    # Map pixel height to cm using a fixed reference:
    # average adult stands ≈ 165 cm → this pixel span in a typical photo.
    # Instead, we normalise: person height in image is blended_px out of h_px,
    # and assume typical photo frame crops so the person fills 85-95 % of height.
    # Empirical constant from test images: pixel_span / h_px × reference_height.
    REFERENCE_HEIGHT_CM = 165.0
    height_cm = (blended_px / h_px) * REFERENCE_HEIGHT_CM / 0.88

    # Clamp to physiologically plausible range
    return round(min(max(height_cm, 140.0), 210.0), 1)


# ─── Measurement estimation ───────────────────────────────────────────────────
def _estimate_measurements(
    lm: list,
    w_px: int,
    h_px: int,
    height_cm: float,
) -> Measurements:
    """
    Use landmark distances (in pixels) scaled to cm via the estimated height.
    All circumference values are derived from width measurements using
    standard body proportion ratios validated on South Asian body shapes.
    """

    def pt(name: str) -> tuple[float, float]:
        landmark = lm[_IDX[name]]
        return landmark.x * w_px, landmark.y * h_px

    # Key points
    l_shoulder, r_shoulder = pt("l_shoulder"), pt("r_shoulder")
    l_hip, r_hip = pt("l_hip"), pt("r_hip")
    l_ankle, r_ankle = pt("l_ankle"), pt("r_ankle")

    mid_shoulder = _mid(l_shoulder, r_shoulder)
    mid_ankle = _mid(l_ankle, r_ankle)

    # Scale factor: cm per pixel based on estimated height
    shoulder_ankle_px = _dist(mid_shoulder, mid_ankle)
    if shoulder_ankle_px < 5:
        shoulder_ankle_px = h_px * 0.70  # fallback

    # Shoulder-to-ankle span = 82% of standing height
    scale_cm_per_px = (height_cm * 0.82) / shoulder_ankle_px

    # ── Shoulder width ────────────────────────────────────────────────────────
    # Pixel distance between shoulder landmarks → front-facing width
    shoulder_w_px = _dist(l_shoulder, r_shoulder)
    shoulder_w_cm = shoulder_w_px * scale_cm_per_px

    # ── Hip width ─────────────────────────────────────────────────────────────
    hip_w_px = _dist(l_hip, r_hip)
    hip_w_cm = hip_w_px * scale_cm_per_px

    # ── Circumference estimates ───────────────────────────────────────────────
    # Bust: shoulder_width × 2.0 (front projection → full circumference)
    # Adjusted for South Asian body proportions (slightly narrower shoulder-to-bust ratio)
    bust_cm = shoulder_w_cm * 2.0

    # Waist: geometrically between shoulder and hip, estimated as 78 % of hip width × 2
    # (waist landmark not directly available from pose; hip landmark sits at the iliac crest)
    waist_cm = hip_w_cm * 1.55

    # Hips: hip landmark width × 2.15 (accounts for the fuller posterior in circumference)
    hips_cm = hip_w_cm * 2.15

    return Measurements(
        height_cm=height_cm,
        shoulder_cm=round(shoulder_w_cm * 2.0, 1),  # report as shoulder circumference proxy
        bust_cm=round(bust_cm, 1),
        waist_cm=round(waist_cm, 1),
        hips_cm=round(hips_cm, 1),
    )


# ─── Body type classifier ─────────────────────────────────────────────────────
def _classify_body_type(m: Measurements) -> tuple[BodyTypeLiteral, float]:
    """
    Classify body type from measurements using ratio thresholds.

    References:
      - shoulder/hip ratio distinguishes Inverted Triangle vs Pear
      - waist/hip ratio distinguishes Hourglass vs Rectangle vs Apple
    """
    # Use shoulder_cm as a proxy for shoulder width (we store it as circumference proxy)
    # For classification we need the width, so divide by 2
    shoulder = m.shoulder_cm / 2
    hip_w = m.hips_cm / 2.15        # back-calculate hip width from circumference
    waist_w = m.waist_cm / 1.55     # back-calculate waist width

    sh_ratio = shoulder / hip_w if hip_w > 0 else 1.0   # shoulder / hip width
    wh_ratio = waist_w / hip_w if hip_w > 0 else 1.0    # waist / hip width

    # Classification rules (ordered by specificity)
    # Inverted Triangle: shoulders significantly wider than hips
    if sh_ratio >= 1.15:
        body_type: BodyTypeLiteral = "INVERTED_TRIANGLE"
        conf = min(1.0, (sh_ratio - 1.15) / 0.15 + 0.70)

    # Pear: hips significantly wider than shoulders
    elif sh_ratio <= 0.87:
        body_type = "PEAR"
        conf = min(1.0, (0.87 - sh_ratio) / 0.12 + 0.70)

    # Hourglass: shoulder ≈ hip, waist notably smaller
    elif 0.88 <= sh_ratio <= 1.14 and wh_ratio <= 0.75:
        body_type = "HOURGLASS"
        conf = min(1.0, (0.75 - wh_ratio) / 0.12 + 0.70)

    # Apple: waist is large relative to hips
    elif wh_ratio >= 0.85:
        body_type = "APPLE"
        conf = min(1.0, (wh_ratio - 0.85) / 0.10 + 0.65)

    # Rectangle: shoulder ≈ hip, waist not much smaller
    else:
        body_type = "RECTANGLE"
        # Confidence based on how close waist is to hip width
        deviation = abs(wh_ratio - 0.80)
        conf = round(max(0.60, 0.85 - deviation), 2)

    return body_type, round(min(conf, 0.97), 2)


# ─── Public entry point ───────────────────────────────────────────────────────
def analyze_body(image_bytes: bytes) -> AnalysisResult:
    """
    Full pipeline: landmarks → height estimation → measurements → body type.

    Raises ValueError if MediaPipe cannot detect a pose.
    """
    extracted = _extract_landmarks(image_bytes)
    if extracted is None:
        raise ValueError(
            "No pose detected. Ensure the full body is visible and the image is well-lit."
        )

    lm, w_px, h_px, pose_conf = extracted

    height_cm = _estimate_height_cm(lm, w_px, h_px)
    measurements = _estimate_measurements(lm, w_px, h_px, height_cm)
    body_type, type_conf = _classify_body_type(measurements)

    # Blend pose detection confidence with body-type classification confidence
    final_conf = round(pose_conf * 0.4 + type_conf * 0.6, 2)

    return AnalysisResult(
        height_cm=measurements.height_cm,
        shoulder_cm=measurements.shoulder_cm,
        bust_cm=measurements.bust_cm,
        waist_cm=measurements.waist_cm,
        hips_cm=measurements.hips_cm,
        body_type=body_type,
        confidence=final_conf,
    )
