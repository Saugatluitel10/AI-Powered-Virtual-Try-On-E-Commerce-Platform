import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from app.services.mediapipe_service import estimate_measurements_from_image
from app.services.body_analysis_service import analyze_body

router = APIRouter()


class AnalyzeBodyRequest(BaseModel):
    image_base64: str


@router.post("/analyze-body")
async def analyze_body_endpoint(payload: AnalyzeBodyRequest):
    """
    Accepts a base64-encoded image, returns body measurements and body type
    without requiring the caller to supply a known height.
    """
    try:
        image_bytes = base64.b64decode(payload.image_base64)
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid base64 image data.")

    try:
        result = analyze_body(image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return result.to_dict()


@router.post("/scan")
async def body_scan(
    photo: UploadFile = File(...),
    height_cm: float = Form(...),
):
    """MediaPipe Pose + BlazePose: estimate body measurements from a single photo."""
    image_bytes = await photo.read()
    measurements = estimate_measurements_from_image(image_bytes, height_cm)
    return {"measurements": measurements, "landmarks_detected": bool(measurements)}
