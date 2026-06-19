import base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.services.segmentation_service import (
    remove_background,
    segment_garment,
    segment_garment_from_url,
    segment_garment_base64,
)

router = APIRouter()


class SegmentGarmentRequest(BaseModel):
    image_url: str


@router.post("/remove-bg")
async def remove_bg(photo: UploadFile = File(...)):
    """Remove background from user photo. Returns raw PNG."""
    image_bytes = await photo.read()
    result = remove_background(image_bytes)
    return Response(content=result, media_type="image/png")


@router.post("/garment")
async def segment_garment_endpoint(photo: UploadFile = File(...)):
    """Segment garment from an uploaded flat-lay image. Returns raw PNG."""
    image_bytes = await photo.read()
    result = segment_garment(image_bytes)
    return Response(content=result, media_type="image/png")


@router.post("/segment-garment")
async def segment_garment_by_url(payload: SegmentGarmentRequest):
    """
    Download a product image by URL, segment the garment,
    and return it as a base64-encoded transparent PNG.
    """
    try:
        png_bytes = segment_garment_from_url(payload.image_url)
        b64 = base64.b64encode(png_bytes).decode("ascii")
        return {
            "garment_base64": b64,
            "content_type": "image/png",
            "size_bytes": len(png_bytes),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Segmentation failed: {exc}",
        )
