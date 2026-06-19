"""
Flat copy of app/services/segmentation_service.py for Modal deployment.
Keep in sync with the canonical file.
"""

from __future__ import annotations

import io
import base64

import httpx
import numpy as np
from PIL import Image
from rembg import remove, new_session

_session = new_session("u2net_cloth_seg")


def remove_background(image_bytes: bytes) -> bytes:
    return remove(image_bytes)


def segment_garment(image_bytes: bytes) -> bytes:
    result_bytes = remove(
        image_bytes,
        session=_session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10,
    )

    img = Image.open(io.BytesIO(result_bytes)).convert("RGBA")
    alpha = np.array(img)[:, :, 3]
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)

    if rows.any() and cols.any():
        rmin, rmax = np.where(rows)[0][[0, -1]]
        cmin, cmax = np.where(cols)[0][[0, -1]]
        margin = 10
        rmin = max(0, rmin - margin)
        rmax = min(img.height - 1, rmax + margin)
        cmin = max(0, cmin - margin)
        cmax = min(img.width - 1, cmax + margin)
        img = img.crop((cmin, rmin, cmax + 1, rmax + 1))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def segment_garment_from_url(image_url: str, timeout: float = 30.0) -> bytes:
    with httpx.Client(timeout=timeout) as client:
        resp = client.get(image_url)
        resp.raise_for_status()
    return segment_garment(resp.content)


def segment_garment_base64(image_bytes: bytes) -> str:
    png_bytes = segment_garment(image_bytes)
    return base64.b64encode(png_bytes).decode("ascii")
