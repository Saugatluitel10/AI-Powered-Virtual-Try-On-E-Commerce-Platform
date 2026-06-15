from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.claude_service import get_style_advice, get_complete_the_look

router = APIRouter()


class StyleAdviceRequest(BaseModel):
    body_profile: dict
    context: str
    product_images: list[str] = []
    user_photo_url: str | None = None


class CompleteTheLookRequest(BaseModel):
    product_name: str
    product_description: str
    product_image_url: str


@router.post("/style-advice")
async def style_advice(req: StyleAdviceRequest):
    """Claude claude-sonnet-4-6: conversational AI stylist with vision."""
    try:
        result = await get_style_advice(
            body_profile=req.body_profile,
            context=req.context,
            product_images=req.product_images,
            user_photo_url=req.user_photo_url,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/complete-the-look")
async def complete_the_look(req: CompleteTheLookRequest):
    try:
        return await get_complete_the_look(
            product_name=req.product_name,
            product_description=req.product_description,
            product_image_url=req.product_image_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
