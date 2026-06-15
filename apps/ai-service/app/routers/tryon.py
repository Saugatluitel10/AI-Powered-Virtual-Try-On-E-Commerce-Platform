from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.tryon_service import submit_tryon, get_tryon_status

router = APIRouter()


class TryOnRequest(BaseModel):
    user_photo_url: str
    garment_image_url: str
    garment_description: str
    model: str = "idm-vton"  # "idm-vton" | "ootdiffusion"


class TryOnStatusResponse(BaseModel):
    status: str
    output: str | None = None
    error: str | None = None


@router.post("/submit")
async def submit(req: TryOnRequest):
    prediction_id = await submit_tryon(
        user_photo_url=req.user_photo_url,
        garment_image_url=req.garment_image_url,
        garment_description=req.garment_description,
        model=req.model,
    )
    return {"prediction_id": prediction_id}


@router.get("/status/{prediction_id}", response_model=TryOnStatusResponse)
async def status(prediction_id: str):
    return await get_tryon_status(prediction_id)
