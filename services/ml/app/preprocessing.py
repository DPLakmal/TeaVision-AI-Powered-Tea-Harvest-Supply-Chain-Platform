"""Image preprocessing pipeline for the TeaVision ML Inference Service.

Converts raw image bytes into normalized PyTorch tensors suitable for
evaluation by MobileNetV3 or EfficientNet TorchScript models.
"""

import io
from typing import List
from PIL import Image, UnidentifiedImageError
import torch
import torchvision.transforms as T

# Standard ImageNet normalization statistics
MEAN: List[float] = [0.485, 0.456, 0.406]
STD: List[float] = [0.229, 0.224, 0.225]


def get_inference_transforms(input_size: int = 224) -> T.Compose:
    """Build torchvision transform pipeline for model inference.

    Args:
        input_size: Target square pixel dimension (height and width).

    Returns:
        T.Compose: Composed transform pipeline with resizing, tensor
            conversion, and ImageNet standardization.
    """
    return T.Compose(
        [
            T.Resize((input_size, input_size)),
            T.ToTensor(),
            T.Normalize(mean=MEAN, std=STD),
        ]
    )


def preprocess_image(image_bytes: bytes, input_size: int = 224) -> torch.Tensor:
    """Convert raw image bytes to a (1, 3, H, W) float tensor.

    Opens the image using Pillow, converts any color mode (such as grayscale,
    RGBA, CMYK) to standard 3-channel RGB, and applies the inference transforms.

    Args:
        image_bytes: Raw binary bytes of the image file.
        input_size: Target spatial dimension for the model input.

    Returns:
        torch.Tensor: Normalized 4-dimensional tensor with shape (1, 3, input_size, input_size).

    Raises:
        ValueError: If image bytes are empty or cannot be decoded as an image.
    """
    if not image_bytes:
        raise ValueError("Image bytes payload is empty.")

    try:
        raw_stream = io.BytesIO(image_bytes)
        img = Image.open(raw_stream)
        # Verify basic image integrity
        img.verify()

        # Re-open stream because verify() modifies file pointer position
        raw_stream.seek(0)
        img = Image.open(raw_stream).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise ValueError(f"Failed to decode image: {str(exc)}") from exc

    transforms = get_inference_transforms(input_size=input_size)
    tensor = transforms(img).unsqueeze(0)
    return tensor
