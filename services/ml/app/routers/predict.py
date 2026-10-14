"""Inference endpoint for tea harvest leaf quality grading."""

import time
from typing import Set
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
import structlog
import torch

from app.config import Settings, get_settings
from app.model_loader import get_device, get_model
from app.preprocessing import preprocess_image
from app.schemas import GradeScores, PredictResponse

logger = structlog.get_logger(__name__)

router = APIRouter()

ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict tea leaf harvest quality grade",
    status_code=status.HTTP_200_OK,
)
async def predict(
    image: UploadFile = File(..., description="Tea harvest leaf image file (JPEG, PNG, or WEBP)"),
    settings: Settings = Depends(get_settings),
) -> PredictResponse:
    """Analyze an uploaded tea leaf photograph and classify its quality grade.

    Performs image decoding, standard ImageNet preprocessing, and runs forward
    inference using the active TorchScript MobileNetV3 or EfficientNet model.

    Args:
        image: Uploaded image file stream.
        settings: Application runtime settings.

    Returns:
        PredictResponse: Predicted grade label, top confidence score, per-class
            probability distribution, and inference latency.

    Raises:
        HTTPException(422): If the image format is unsupported or bytes corrupted.
        HTTPException(413): If the image exceeds the configured size limit.
    """
    # 1. Validate content type header
    content_type = image.content_type or ""
    if content_type.lower() not in ALLOWED_MIME_TYPES:
        logger.warning("Rejected upload with invalid content type", content_type=content_type)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid file content type '{content_type}'. "
                f"Supported types are: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )

    # 2. Read file bytes
    image_bytes = await image.read()
    max_bytes = settings.max_upload_size_mb * 1024 * 1024

    # 3. Validate file payload size
    if len(image_bytes) > max_bytes:
        size_mb = round(len(image_bytes) / (1024 * 1024), 2)
        logger.warning("Upload exceeds maximum allowed size", size_mb=size_mb, limit_mb=settings.max_upload_size_mb)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file size ({size_mb} MB) exceeds maximum allowed limit of {settings.max_upload_size_mb} MB.",
        )

    # 4. Preprocess image into tensor
    try:
        tensor = preprocess_image(image_bytes, input_size=settings.input_size)
    except ValueError as exc:
        logger.warning("Failed to preprocess uploaded image", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unprocessable image data: {str(exc)}",
        ) from exc

    # 5. Run inference with torch.no_grad()
    model = get_model()
    device = get_device()
    tensor = tensor.to(device)

    start_time = time.perf_counter()
    with torch.no_grad():
        logits = model(tensor)
        if logits.dim() == 1:
            logits = logits.unsqueeze(0)
        probabilities = torch.softmax(logits, dim=1).squeeze(0)
        pred_idx = int(torch.argmax(probabilities).item())
        confidence = float(probabilities[pred_idx].item())

    inference_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    # 6. Map predictions to response models
    class_names = settings.class_names
    predicted_grade = class_names[pred_idx] if pred_idx < len(class_names) else "unknown"

    score_map = {
        class_names[i]: float(probabilities[i].item())
        for i in range(min(len(class_names), len(probabilities)))
    }

    scores = GradeScores(
        high_quality=score_map.get("high_quality", 0.0),
        medium_quality=score_map.get("medium_quality", 0.0),
        low_quality=score_map.get("low_quality", 0.0),
    )

    logger.info(
        "Inference completed successfully",
        filename=image.filename,
        predicted_grade=predicted_grade,
        confidence=round(confidence, 4),
        inference_ms=inference_ms,
    )

    return PredictResponse(
        grade=predicted_grade,
        confidence=confidence,
        scores=scores,
        model_version=settings.model_version,
        inference_ms=inference_ms,
        model_arch=settings.model_arch,
    )
