import io
import numpy as np
from PIL import Image
import mediapipe as mp

mp_pose = mp.solutions.pose


def estimate_measurements_from_image(image_bytes: bytes, height_cm: float) -> dict:
    """
    MediaPipe Pose + BlazePose Heavy: estimate body measurements from a single photo.
    Scales landmark distances by the user's known height to produce cm measurements.
    """
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_array = np.array(image)
    h_px, w_px = img_array.shape[:2]

    with mp_pose.Pose(
        static_image_mode=True,
        model_complexity=2,  # BlazePose Heavy
        min_detection_confidence=0.5,
    ) as pose:
        results = pose.process(img_array)

    if not results.pose_landmarks:
        return {}

    lm = results.pose_landmarks.landmark

    def pt(idx: int) -> tuple[float, float]:
        return lm[idx].x * w_px, lm[idx].y * h_px

    def dist(a: tuple, b: tuple) -> float:
        return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

    nose = pt(0)
    l_shoulder, r_shoulder = pt(11), pt(12)
    l_hip, r_hip = pt(23), pt(24)
    l_ankle, r_ankle = pt(27), pt(28)

    mid_ankle = ((l_ankle[0] + r_ankle[0]) / 2, (l_ankle[1] + r_ankle[1]) / 2)
    mid_hip = ((l_hip[0] + r_hip[0]) / 2, (l_hip[1] + r_hip[1]) / 2)

    person_height_px = dist(nose, mid_ankle)
    if person_height_px < 10:
        return {}

    scale = height_cm / person_height_px
    shoulder_w = dist(l_shoulder, r_shoulder) * scale
    hip_w = dist(l_hip, r_hip) * scale

    return {
        "height_cm": round(height_cm, 1),
        "shoulder_width_cm": round(shoulder_w, 1),
        "chest_cm": round(shoulder_w * 2.05, 1),
        "waist_cm": round(hip_w * 1.55, 1),
        "hips_cm": round(hip_w * 2.15, 1),
        "inseam_cm": round(dist(mid_hip, mid_ankle) * scale, 1),
    }
