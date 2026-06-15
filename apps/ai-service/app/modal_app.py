import modal

# GPU image with all AI deps pre-installed
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "fastapi",
        "uvicorn[standard]",
        "python-multipart",
        "mediapipe",
        "Pillow",
        "numpy",
        "opencv-python-headless",
        "rembg",
        "replicate",
        "anthropic",
        "pydantic-settings",
        "httpx",
    )
)

app = modal.App("vtryon-ai-service", image=image)

# Mount the full app directory
app_mount = modal.Mount.from_local_dir(".", remote_path="/app")


@app.function(
    gpu="A10G",          # GPU for MediaPipe + image processing
    cpu=2,
    memory=4096,
    timeout=120,
    mounts=[app_mount],
    secrets=[modal.Secret.from_name("vtryon-ai-secrets")],
)
@modal.asgi_app()
def fastapi_app():
    import sys
    sys.path.insert(0, "/app")
    from app.main import app as fastapi_application
    return fastapi_application
