"""Health check and model metadata endpoints for TeaVision ML Service."""

from fastapi import APIRouter, Depends
from app.config import Settings, get_settings
from app.model_loader import is_model_loaded
from app.schemas import HealthResponse, ModelInfoResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Service health status")
async def health(
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """Check service operational status and verify model availability.

    Args:
        settings: Application settings injected via FastAPI dependency.

    Returns:
        HealthResponse: Status string, model loaded flag, path, and architecture.
    """
    return HealthResponse(
        status="ok",
        model_loaded=is_model_loaded(),
        model_path=settings.model_path,
        model_arch=settings.model_arch,
    )


@router.get("/model-info", response_model=ModelInfoResponse, summary="Model architecture and metadata")
async def model_info(
    settings: Settings = Depends(get_settings),
) -> ModelInfoResponse:
    """Retrieve metadata about the active ML model artifact.

    Args:
        settings: Application settings injected via FastAPI dependency.

    Returns:
        ModelInfoResponse: Version, architecture, class count, class names, and input size.
    """
    return ModelInfoResponse(
        model_version=settings.model_version,
        model_arch=settings.model_arch,
        num_classes=settings.num_classes,
        class_names=settings.class_names,
        input_size=settings.input_size,
    )
