"""Tests for the /predict inference endpoint."""

from fastapi.testclient import TestClient
import pytest

from app.schemas import PredictResponse


def test_predict_valid_jpeg(client: TestClient, sample_jpeg_image: bytes) -> None:
    """Verify inference returns 200 OK and valid prediction schema for a JPEG."""
    response = client.post(
        "/predict",
        files={"image": ("tea_leaf.jpg", sample_jpeg_image, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()

    # Validate schema parsing
    parsed = PredictResponse.model_validate(data)
    assert parsed.grade in {"high_quality", "medium_quality", "low_quality"}
    assert 0.0 <= parsed.confidence <= 1.0
    assert parsed.inference_ms >= 0.0
    assert parsed.model_arch in {"mobilenetv3", "efficientnet"}

    # Probability sum validation
    total_score = (
        parsed.scores.high_quality
        + parsed.scores.medium_quality
        + parsed.scores.low_quality
    )
    assert pytest.approx(total_score, rel=1e-3) == 1.0


def test_predict_valid_png(client: TestClient, sample_png_image: bytes) -> None:
    """Verify inference returns 200 OK for a valid PNG upload."""
    response = client.post(
        "/predict",
        files={"image": ("tea_leaf.png", sample_png_image, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["grade"] in {"high_quality", "medium_quality", "low_quality"}
    assert 0.0 <= data["confidence"] <= 1.0


def test_predict_invalid_content_type(client: TestClient) -> None:
    """Verify endpoint rejects unsupported file types with 422 Unprocessable Entity."""
    response = client.post(
        "/predict",
        files={"image": ("report.txt", b"sample plain text", "text/plain")},
    )
    assert response.status_code == 422
    data = response.json()
    assert "Invalid file content type" in data["detail"]


def test_predict_corrupted_image(client: TestClient, corrupted_image_bytes: bytes) -> None:
    """Verify endpoint rejects unparseable image bytes with 422 Unprocessable Entity."""
    response = client.post(
        "/predict",
        files={"image": ("broken.jpg", corrupted_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 422
    data = response.json()
    assert "Unprocessable image data" in data["detail"]


def test_predict_oversized_file(client: TestClient, oversized_image_bytes: bytes) -> None:
    """Verify endpoint rejects payloads exceeding configured MB size with 413."""
    response = client.post(
        "/predict",
        files={"image": ("oversized.jpg", oversized_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 413
    data = response.json()
    assert "exceeds maximum allowed limit" in data["detail"]
