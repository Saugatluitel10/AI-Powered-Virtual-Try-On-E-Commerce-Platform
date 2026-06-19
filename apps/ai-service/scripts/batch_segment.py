"""
Batch garment segmentation script.

Fetches all try-on-enabled products from the database via the Node.js API,
segments each product's primary image, and uploads the result to
Supabase Storage under garment-segments/{productId}.png.

Usage:
    python scripts/batch_segment.py --api-url http://localhost:8000/api/v1

Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
"""

from __future__ import annotations

import argparse
import os
import sys
import time

import httpx
from supabase import create_client

# Add the parent dir so we can import the segmentation service
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.segmentation_service import segment_garment_from_url

BUCKET = "garment-segments"


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch segment product garments")
    parser.add_argument(
        "--api-url",
        default=os.environ.get("API_URL", "http://localhost:8000/api/v1"),
        help="Base URL of the Node.js API (e.g. http://localhost:8000/api/v1)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-segment products that already have a cached segment",
    )
    args = parser.parse_args()

    supabase_url = os.environ["SUPABASE_URL"]
    supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    supabase = create_client(supabase_url, supabase_key)

    # Ensure bucket exists
    try:
        supabase.storage.create_bucket(BUCKET, {"public": False})
        print(f"[+] Created bucket '{BUCKET}'")
    except Exception:
        print(f"[~] Bucket '{BUCKET}' already exists")

    # Fetch all try-on-enabled products
    page = 1
    products: list[dict] = []
    while True:
        resp = httpx.get(
            f"{args.api_url}/products",
            params={"isTryonEnabled": "true", "page": str(page), "pageSize": "50"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()["data"]
        products.extend(data["items"])
        if data["page"] >= data["totalPages"]:
            break
        page += 1

    print(f"[*] Found {len(products)} try-on-enabled products")

    success = 0
    skipped = 0
    failed = 0

    for product in products:
        pid = product["id"]
        image_url = product.get("primaryImageUrl")
        storage_path = f"{pid}.png"

        if not image_url:
            print(f"  [!] {pid} — no image URL, skipping")
            skipped += 1
            continue

        # Check if already segmented
        if not args.force:
            existing = supabase.storage.from_(BUCKET).list(path="", options={"search": pid})
            if any(f["name"] == f"{pid}.png" for f in (existing or [])):
                print(f"  [~] {pid} — already segmented, skipping")
                skipped += 1
                continue

        try:
            start = time.monotonic()
            png_bytes = segment_garment_from_url(image_url)
            elapsed = time.monotonic() - start

            supabase.storage.from_(BUCKET).upload(
                storage_path,
                png_bytes,
                {"content-type": "image/png", "upsert": "true"},
            )

            print(f"  [✓] {pid} — segmented in {elapsed:.1f}s ({len(png_bytes)} bytes)")
            success += 1
        except Exception as exc:
            print(f"  [✗] {pid} — {exc}")
            failed += 1

    print(f"\nDone: {success} segmented, {skipped} skipped, {failed} failed")


if __name__ == "__main__":
    main()
