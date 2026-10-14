"""Pydantic v2 data schemas for the TeaVision ML Inference Service.

Defines the structure for request bodies, prediction responses, health status,
and model metadata.
"""

from typing import List
from pydantic import BaseModel, Field


class GradeScores(BaseModel):
    """Probability scores for each tea harvest quality grade."""

    high_quality: float = Field(
        ...,
        description="Probability score for high quality tea leaf (tender two leaves and a bud)",
        ge=0.0,
        le=1.0,
    )
    medium_quality: float = Field(
        ...,
        description="Probability score for medium quality tea leaf (mature shoot, coarse foliage)",
        ge=0.0,
        le=1.0,
    )
    low_quality: float = Field(
        ...,
        description="Probability score for low quality tea leaf (damaged, diseased, or coarse stems)",
        ge=0.0,
        le=1.0,
    )


class PredictResponse(BaseModel):
    """Response payload returned by the tea grading inference endpoint."""

    grade: str = Field(
        ...,
        description="Predicted tea harvest grade category: high_quality, medium_quality, or low_quality",
    )
    confidence: float = Field(
        ...,
        description="Confidence score (highest class probability) for the prediction",
        ge=0.0,
        le=1.0,
    )
    scores: GradeScores = Field(
        ...,
        description="Detailed probability distribution across all three quality grades",
    )
    model_version: str = Field(
        ...,
        description="Semantic version string of the active ML model artifact",
    )
    inference_ms: float = Field(
        ...,
        description="Latency of neural network forward pass in milliseconds",
        ge=0.0,
    )
    model_arch: str = Field(
        ...,
        description="Architecture name of the deployed model (e.g., mobilenetv3, efficientnet)",
    )


class HealthResponse(BaseModel):
    """System health check response."""

    status: str = Field(
        ...,
        description="Overall service operational status (e.g., 'ok', 'degraded')",
    )
    model_loaded: bool = Field(
        ...,
        description="Boolean indicating whether the PyTorch/TorchScript model is loaded in memory",
    )
    model_path: str = Field(
        ...,
        description="Configured filesystem path to the model artifact",
    )
    model_arch: str = Field(
        ...,
        description="Configured neural network architecture",
    )


class ModelInfoResponse(BaseModel):
    """Metadata response detailing the active ML model configuration."""

    model_version: str = Field(
        ...,
        description="Active model version tag",
    )
    model_arch: str = Field(
        ...,
        description="Active model architecture name",
    )
    num_classes: int = Field(
        ...,
        description="Number of target output classification classes",
    )
    class_names: List[str] = Field(
        ...,
        description="Ordered list of target quality class names corresponding to logits",
    )
    input_size: int = Field(
        ...,
        description="Expected square image input dimension in pixels",
    )
