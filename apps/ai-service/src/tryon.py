import replicate
from app.config import settings

_client = replicate.Client(api_token=settings.replicate_api_token)

# Model versions: OOTDiffusion or IDM-VTON (both available on Replicate)
MODELS = {
    "idm-vton": {
        "version": settings.replicate_vton_version,
        "input_keys": ("human_img", "garm_img", "garment_des"),
    },
    "ootdiffusion": {
        # OOTDiffusion via Replicate — faster, slightly lower quality
        "version": "levihsu/ootdiffusion:8600197a6e4f1e1a06fc4ce35cdc36b0e9e66e36a8d4d9ba4e5e94a6d5f8e1c",
        "input_keys": ("human_img", "cloth_img", "cloth_type"),
    },
}


async def submit_tryon(
    user_photo_url: str,
    garment_image_url: str,
    garment_description: str,
    model: str = "idm-vton",
) -> str:
    """Submit a virtual try-on prediction and return the prediction ID."""
    model_config = MODELS.get(model, MODELS["idm-vton"])

    if model == "idm-vton":
        prediction = _client.predictions.create(
            version=model_config["version"],
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
    else:
        prediction = _client.predictions.create(
            version=model_config["version"],
            input={
                "human_img": user_photo_url,
                "cloth_img": garment_image_url,
                "cloth_type": "upper",  # upper | lower | overall
            },
        )

    return prediction.id


async def get_tryon_status(prediction_id: str) -> dict:
    """Poll prediction status. Returns status + output URL when done."""
    prediction = _client.predictions.get(prediction_id)
    output = prediction.output

    return {
        "status": prediction.status,
        "output": output if isinstance(output, str) else (output[0] if output else None),
        "error": prediction.error,
    }
