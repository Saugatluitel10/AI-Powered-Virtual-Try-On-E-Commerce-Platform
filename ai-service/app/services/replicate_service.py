import replicate
import httpx
from app.config import settings

replicate_client = replicate.Client(api_token=settings.replicate_api_token)


async def create_tryon_prediction(
    user_photo_url: str,
    garment_image_url: str,
    garment_description: str,
) -> str:
    """Submit IDM-VTON prediction and return the prediction ID."""
    prediction = replicate_client.predictions.create(
        version=settings.replicate_vton_version,
        input={
            "human_img": user_photo_url,
            "garm_img": garment_image_url,
            "garment_des": garment_description,
            "is_checked": True,
            "is_checked_crop": False,
            "denoise_steps": 30,
            "seed": 42,
        },
    )
    return prediction.id


async def get_prediction_status(prediction_id: str) -> dict:
    """Poll a prediction and return its current status and output."""
    prediction = replicate_client.predictions.get(prediction_id)
    return {
        "status": prediction.status,
        "output": prediction.output,
        "error": prediction.error,
    }


async def download_result_image(url: str) -> bytes:
    """Download the result image bytes from Replicate output URL."""
    async with httpx.AsyncClient() as client:
        response = await client.get(url, follow_redirects=True, timeout=60.0)
        response.raise_for_status()
        return response.content
