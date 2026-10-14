"""Tests for health check and model metadata endpoints."""

from fastapi.testclient import TestClient
from app.schemas import HealthResponse, ModelInfoResponse


def test_health_endpoint(client: TestClient) -> None:
    """Verify /health returns 200 OK and reports model loaded."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()

    parsed = HealthResponse.model_validate(data)
    assert parsed.status == "ok"
    assert parsed.model_loaded is True
    assert parsed.model_arch in {"mobilenetv3", "efficientnet"}


def test_model_info_endpoint(client: TestClient) -> None:
    """Verify /model-info returns active model configuration."""
    response = client.get("/model-info")
    assert response.status_code == 200
    data = response.json()

    parsed = ModelInfoResponse.model_validate(data)
    assert parsed.num_classes == 3
    assert parsed.class_names == ["high_quality", "medium_quality", "low_quality"]
    assert parsed.input_size == 224
    assert parsed.model_version == "v1.0.0"


def test_root_redirect_to_docs(client: TestClient) -> None:
    """Verify root GET / redirects to /docs."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"
