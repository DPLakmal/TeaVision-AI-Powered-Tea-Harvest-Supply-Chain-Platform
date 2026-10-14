"""TorchScript model loader for the TeaVision ML Inference Service.

Implements a thread-safe singleton pattern using asyncio locks to load,
cache, and serve the TorchScript tea grading model or a development fallback.
"""

import asyncio
from pathlib import Path
import time
from typing import Optional
import structlog
import torch
import torch.nn as nn
import torchvision.models as models

from app.config import Settings

logger = structlog.get_logger(__name__)

# Module-level singleton state
_model: Optional[nn.Module] = None
_lock: asyncio.Lock = asyncio.Lock()
_device: Optional[torch.device] = None


class FallbackTeaGrader(nn.Module):
    """Fallback MobileNetV3-Large network for local development without saved weights."""

    def __init__(self, num_classes: int = 3):
        """Initialize fallback architecture with randomly initialized weights.

        Args:
            num_classes: Number of tea grading classes to output.
        """
        super().__init__()
        try:
            self.net: nn.Module = models.mobilenet_v3_large(weights=None)
            in_features = self.net.classifier[3].in_features
            self.net.classifier[3] = nn.Linear(in_features, num_classes)
        except Exception as exc:
            logger.warning("Failed to initialize torchvision MobileNetV3; using minimal fallback", error=str(exc))
            self.net = nn.Sequential(
                nn.AdaptiveAvgPool2d((1, 1)),
                nn.Flatten(),
                nn.Linear(3, num_classes),
            )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through the fallback network.

        Args:
            x: Input tensor of shape (B, C, H, W).

        Returns:
            torch.Tensor: Unnormalized logits of shape (B, num_classes).
        """
        return self.net(x)


def get_device() -> torch.device:
    """Determine the most optimal available compute device.

    Returns:
        torch.device: CUDA GPU if available, Apple Silicon MPS if available,
            otherwise CPU.
    """
    global _device
    if _device is not None:
        return _device

    if torch.cuda.is_available():
        _device = torch.device("cuda")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        _device = torch.device("mps")
    else:
        _device = torch.device("cpu")

    return _device


def is_model_loaded() -> bool:
    """Check if the model singleton is currently initialized and loaded.

    Returns:
        bool: True if model is present in memory, False otherwise.
    """
    return _model is not None


def get_model() -> nn.Module:
    """Retrieve the loaded model singleton instance.

    Returns:
        nn.Module: Loaded PyTorch/TorchScript model in evaluation mode.

    Raises:
        RuntimeError: If model has not been initialized via load_model().
    """
    global _model
    if _model is None:
        raise RuntimeError("Model is not initialized. Ensure load_model() was called during startup.")
    return _model


def set_model(model: Optional[nn.Module]) -> None:
    """Set the active model singleton. Primarily used for unit testing and mocking.

    Args:
        model: Model instance to set or None to clear.
    """
    global _model
    _model = model


def reset_model() -> None:
    """Reset the loaded model singleton to None."""
    global _model
    _model = None


async def load_model(settings: Settings) -> nn.Module:
    """Load the TorchScript model from disk or initialize a development fallback.

    Thread-safe initialization using an asyncio Lock. Sets model to evaluation
    mode and transfers it to the target compute device.

    Args:
        settings: Application settings containing model_path, arch, and num_classes.

    Returns:
        nn.Module: Loaded or initialized model instance.
    """
    global _model
    if _model is not None:
        return _model

    async with _lock:
        # Double-check inside the lock
        if _model is not None:
            return _model

        device = get_device()
        model_path = Path(settings.model_path)
        start_time = time.perf_counter()

        if model_path.is_file():
            logger.info(
                "Loading TorchScript model artifact from disk",
                model_path=str(model_path),
                device=str(device),
            )
            try:
                loaded = torch.jit.load(str(model_path), map_location=device)
                loaded.eval()
                _model = loaded
                load_time_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
                logger.info(
                    "TorchScript model loaded successfully",
                    load_time_ms=load_time_ms,
                    model_path=str(model_path),
                )
            except Exception as exc:
                logger.error(
                    "Failed to load TorchScript model from path; falling back to development model",
                    error=str(exc),
                    model_path=str(model_path),
                )
                fallback = FallbackTeaGrader(num_classes=settings.num_classes).to(device)
                fallback.eval()
                _model = fallback
        else:
            logger.warning(
                "Model file not found at path; initializing fallback MobileNetV3 model for development",
                model_path=str(model_path),
                device=str(device),
            )
            fallback = FallbackTeaGrader(num_classes=settings.num_classes).to(device)
            fallback.eval()
            _model = fallback

        return _model
