from fastapi import APIRouter, UploadFile, File, Form
from app.services.mediapipe_service import estimate_measurements_from_image

router = APIRouter()


@router.post("/scan")
async def body_scan(
    photo: UploadFile = File(...),
    height_cm: float = Form(...),
):
    """MediaPipe Pose + BlazePose: estimate body measurements from a single photo."""
    image_bytes = await photo.read()
    measurements = estimate_measurements_from_image(image_bytes, height_cm)
    return {"measurements": measurements, "landmarks_detected": bool(measurements)}
