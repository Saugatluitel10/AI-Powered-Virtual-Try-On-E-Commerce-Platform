from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.config import settings
from app.routers import tryon, body_analysis, recommendations, segmentation


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="VTryon AI Service",
    description="Python FastAPI microservice — wraps OOTDiffusion/IDM-VTON, MediaPipe Pose, SAM 2, Claude stylist",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.backend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(tryon.router, prefix="/try-on", tags=["try-on"])
app.include_router(body_analysis.router, prefix="/body", tags=["body-analysis"])
app.include_router(segmentation.router, prefix="/segment", tags=["segmentation"])
app.include_router(recommendations.router, prefix="/recommend", tags=["recommendations"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}
