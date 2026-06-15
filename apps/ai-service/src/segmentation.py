import io
from PIL import Image
from rembg import remove


def remove_background(image_bytes: bytes) -> bytes:
    """
    Remove background using rembg (U2Net).
    SAM 2 (Segment Anything Model 2) can be swapped in here for higher quality
    once installed: pip install git+https://github.com/facebookresearch/segment-anything-2
    Returns PNG bytes with transparent background.
    """
    return remove(image_bytes)


def segment_garment(image_bytes: bytes) -> bytes:
    """
    Segment garment from flat-lay image.
    Currently uses rembg; replace with SAM 2 for precise garment boundaries.
    """
    return remove(image_bytes)
