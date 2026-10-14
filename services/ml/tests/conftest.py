"""Pytest fixtures for the TeaVision ML Inference Service test suite."""

import io
from typing import Generator
from fastapi.testclient import TestClient
from PIL import Image
import pytest

from app.main import create_app
from app.model_loader import reset_model


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient with lifespan context initialized.

    Yields:
        TestClient: Initialized test client.
    """
    app = create_app()
    with TestClient(app) as test_client:
        yield test_client
    reset_model()


@pytest.fixture
def sample_jpeg_image() -> bytes:
    """Generate a synthetic valid JPEG image as raw bytes.

    Returns:
        bytes: Raw JPEG image bytes.
    """
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))  # Forest green
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=90)
    return buffer.getvalue()


@pytest.fixture
def sample_png_image() -> bytes:
    """Generate a synthetic valid PNG image as raw bytes.

    Returns:
        bytes: Raw PNG image bytes.
    """
    img = Image.new("RGB", (224, 224), color=(60, 179, 113))  # Medium sea green
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture
def oversized_image_bytes() -> bytes:
    """Generate bytes payload exceeding the default 10MB limit (11 MB).

    Returns:
        bytes: 11 megabytes of dummy data.
    """
    return b"0" * (11 * 1024 * 1024)


@pytest.fixture
def corrupted_image_bytes() -> bytes:
    """Generate invalid, unparseable bytes with non-image content.

    Returns:
        bytes: Non-image random byte sequence.
    """
    return b"NotAnImageHeader" + b"\x00\xFF" * 128
