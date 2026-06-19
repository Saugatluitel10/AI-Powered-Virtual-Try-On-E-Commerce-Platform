from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.tryon_service import submit_tryon, get_tryon_status, run_tryon_sync

router = APIRouter()


class TryOnSubmitRequest(BaseModel):
    user_photo_url: str
    garment_image_url: str
    garment_description: str = "garment"


class TryOnRequest(BaseModel):
    user_photo_url: str
    garment_url: str
    product_id: str
    garment_description: str = "garment"


class TryOnStatusResponse(BaseModel):
    status: str
    output: str | None = None
    error: str | None = None


@router.post("/submit")
async def submit(req: TryOnSubmitRequest):
    """Submit a virtual try-on prediction (async). Returns prediction_id for polling."""
    prediction_id = await submit_tryon(
        user_photo_url=req.user_photo_url,
        garment_image_url=req.garment_image_url,
        garment_description=req.garment_description,
    )
    return {"prediction_id": prediction_id}


@router.get("/status/{prediction_id}", response_model=TryOnStatusResponse)
async def status(prediction_id: str):
    """Poll status of a try-on prediction."""
    return await get_tryon_status(prediction_id)


@router.post("/try-on")
async def try_on_sync(req: TryOnRequest):
    """
    Synchronous try-on: submit + poll until complete or 60s timeout.

    Returns:
        prediction_id, status, result_url, processing_time_ms, error
    """
    result = await run_tryon_sync(
        user_photo_url=req.user_photo_url,
        garment_url=req.garment_url,
        garment_description=req.garment_description,
        timeout_seconds=60,
    )

    if result["status"] == "timeout":
        raise HTTPException(status_code=408, detail=result["error"])

    if result["status"] == "failed":
        raise HTTPException(status_code=502, detail=result["error"])

    return {
        "prediction_id": result["prediction_id"],
        "result_url": result["result_url"],
        "processing_time_ms": result["processing_time_ms"],
        "product_id": req.product_id,
    }
