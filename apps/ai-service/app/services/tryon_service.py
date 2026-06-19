"""
Virtual try-on service — IDM-VTON via Replicate.

Supports both fire-and-forget (async prediction ID) and synchronous
wait-for-result (polling up to a configurable timeout).
"""

from __future__ import annotations

import asyncio
import time

import replicate

from app.config import settings

_client = replicate.Client(api_token=settings.replicate_api_token)

MODELS = {
    "idm-vton": {
        "version": settings.replicate_vton_version,
    },
}

MAX_POLL_SECONDS = 60
POLL_INTERVAL = 3


async def submit_tryon(
    user_photo_url: str,
    garment_image_url: str,
    garment_description: str = "garment",
    model: str = "idm-vton",
) -> str:
    """Submit a virtual try-on prediction. Returns the Replicate prediction ID."""
    model_config = MODELS.get(model, MODELS["idm-vton"])

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
    return prediction.id


async def get_tryon_status(prediction_id: str) -> dict:
    """Poll a single prediction. Returns status + output URL when done."""
    prediction = _client.predictions.get(prediction_id)
    output = prediction.output

    return {
        "status": prediction.status,
        "output": output if isinstance(output, str) else (output[0] if output else None),
        "error": prediction.error,
    }


async def run_tryon_sync(
    user_photo_url: str,
    garment_url: str,
    garment_description: str = "garment",
    timeout_seconds: int = MAX_POLL_SECONDS,
) -> dict:
    """
    Submit a try-on and poll until complete or timeout.

    Returns:
        {
            "prediction_id": str,
            "status": "succeeded" | "failed" | "timeout",
            "result_url": str | None,
            "processing_time_ms": int,
            "error": str | None,
        }
    """
    start = time.monotonic()

    prediction_id = await submit_tryon(
        user_photo_url=user_photo_url,
        garment_image_url=garment_url,
        garment_description=garment_description,
    )

    while True:
        elapsed = time.monotonic() - start
        if elapsed >= timeout_seconds:
            return {
                "prediction_id": prediction_id,
                "status": "timeout",
                "result_url": None,
                "processing_time_ms": int(elapsed * 1000),
                "error": f"Try-on timed out after {timeout_seconds}s. The prediction may still complete — poll /try-on/status/{prediction_id}.",
            }

        result = await get_tryon_status(prediction_id)

        if result["status"] == "succeeded" and result["output"]:
            return {
                "prediction_id": prediction_id,
                "status": "succeeded",
                "result_url": result["output"],
                "processing_time_ms": int((time.monotonic() - start) * 1000),
                "error": None,
            }

        if result["status"] == "failed":
            return {
                "prediction_id": prediction_id,
                "status": "failed",
                "result_url": None,
                "processing_time_ms": int((time.monotonic() - start) * 1000),
                "error": result.get("error") or "Model inference failed.",
            }

        if result["status"] == "canceled":
            return {
                "prediction_id": prediction_id,
                "status": "failed",
                "result_url": None,
                "processing_time_ms": int((time.monotonic() - start) * 1000),
                "error": "Prediction was canceled.",
            }

        await asyncio.sleep(POLL_INTERVAL)
