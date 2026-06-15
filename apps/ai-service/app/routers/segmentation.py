from fastapi import APIRouter, UploadFile, File
from fastapi.responses import Response
from app.services.segmentation_service import remove_background, segment_garment

router = APIRouter()


@router.post("/remove-bg")
async def remove_bg(photo: UploadFile = File(...)):
    """SAM 2 / rembg: remove background from user photo."""
    image_bytes = await photo.read()
    result = remove_background(image_bytes)
    return Response(content=result, media_type="image/png")


@router.post("/garment")
async def segment_garment_endpoint(photo: UploadFile = File(...)):
    """SAM 2: precise garment silhouette extraction."""
    image_bytes = await photo.read()
    result = segment_garment(image_bytes)
    return Response(content=result, media_type="image/png")
