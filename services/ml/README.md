# TeaVision ML Inference Service

Production-ready FastAPI inference service for real-time tea harvest leaf quality grading. Serves TorchScript-exported MobileNetV3 and EfficientNet-B0 models to classify freshly plucked tea leaves into three commercial quality grades:
- **`high_quality`**: Two leaves and a bud (tender, optimal moisture and catechin profile)
- **`medium_quality`**: Mature shoot, coarse leaves, minor blemishes
- **`low_quality`**: Damaged, diseased (blister blight, red rust), overgrown leaves or woody stems

---

## Tech Stack

- **Python**: 3.11
- **Framework**: FastAPI 0.111.0 + Uvicorn
- **Machine Learning**: PyTorch 2.3.1 + TorchVision 0.18.1 (TorchScript runtime)
- **Image Processing**: Pillow 10.3.0
- **Validation**: Pydantic v2 + Pydantic-Settings
- **Structured Logging**: structlog 24.2.0
- **Testing**: pytest, httpx

---

## Directory Structure

```
services/ml/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory, lifespan, CORS, error handlers
│   ├── config.py            # Pydantic v2 Settings from environment / .env
│   ├── schemas.py           # Pydantic v2 request/response schemas
│   ├── model_loader.py      # Thread-safe singleton TorchScript model loader & fallback
│   ├── preprocessing.py     # Image decoding and ImageNet normalization pipeline
│   └── routers/
│       ├── __init__.py
│       ├── predict.py       # POST /predict endpoint
│       └── health.py        # GET /health, GET /model-info endpoints
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures: TestClient, synthetic JPEG/PNG fixtures
│   ├── test_predict.py      # Unit & integration tests for /predict
│   └── test_health.py       # Health checks and metadata endpoint tests
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## API Endpoints

### 1. `POST /predict`
Upload an image of tea leaves to obtain a quality grade classification.

- **Content-Type**: `multipart/form-data`
- **Supported Formats**: `image/jpeg`, `image/png`, `image/webp`
- **Max File Size**: 10 MB (configurable via `MAX_UPLOAD_SIZE_MB`)

**Example Request (curl):**
```bash
curl -X POST "http://localhost:8000/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "image=@/path/to/tea_leaf.jpg"
```

**Example Response (200 OK):**
```json
{
  "grade": "high_quality",
  "confidence": 0.9412,
  "scores": {
    "high_quality": 0.9412,
    "medium_quality": 0.0482,
    "low_quality": 0.0106
  },
  "model_version": "v1.0.0",
  "inference_ms": 14.85,
  "model_arch": "mobilenetv3"
}
```

**Error Responses:**
- `413 Payload Too Large`: If the uploaded image exceeds the maximum permitted size.
- `422 Unprocessable Entity`: If the file MIME type is unsupported or image data is corrupted.

---

### 2. `GET /health`
Liveness and readiness check. Returns the operational status and whether the ML model is resident in memory.

**Response (200 OK):**
```json
{
  "status": "ok",
  "model_loaded": true,
  "model_path": "/app/models/tea_grader.pt",
  "model_arch": "mobilenetv3"
}
```

---

### 3. `GET /model-info`
Provides model architecture parameters, input resolutions, and label mappings.

**Response (200 OK):**
```json
{
  "model_version": "v1.0.0",
  "model_arch": "mobilenetv3",
  "num_classes": 3,
  "class_names": [
    "high_quality",
    "medium_quality",
    "low_quality"
  ],
  "input_size": 224
}
```

---

### 4. `GET /`
Redirects automatically to the Swagger UI at `/docs`.

---

## Configuration

Settings are managed via environment variables or a local `.env` file:

| Variable | Type | Default | Description |
|---|---|---|---|
| `MODEL_PATH` | `str` | `/app/models/tea_grader.pt` | Filesystem path to the exported TorchScript model |
| `MODEL_ARCH` | `str` | `mobilenetv3` | Model architecture (`mobilenetv3` or `efficientnet`) |
| `MODEL_VERSION` | `str` | `v1.0.0` | Semantic model version tag |
| `NUM_CLASSES` | `int` | `3` | Number of quality classification classes |
| `CLASS_NAMES` | `list[str]` | `["high_quality", "medium_quality", "low_quality"]` | JSON array of class names |
| `INPUT_SIZE` | `int` | `224` | Input spatial image dimension ($224 \times 224$) |
| `HOST` | `str` | `0.0.0.0` | Bind host interface |
| `PORT` | `int` | `8000` | Bind port number |
| `ML_ENV` | `str` | `development` | Deployment environment (`development`, `staging`, `production`) |
| `MAX_UPLOAD_SIZE_MB` | `int` | `10` | Maximum allowed image payload size in MB |

> [!NOTE]
> When `MODEL_PATH` does not exist on disk (such as during local development before weights are trained), the service automatically instantiates a fallback MobileNetV3 network with random weights so development can proceed uninterrupted.

---

## Local Development & Setup

### 1. Create a Python 3.11 Virtual Environment
```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API documentation will be accessible at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Running Automated Tests

Run the full pytest suite:
```bash
pytest tests/ -v
```

---

## Docker Deployment

### 1. Build Docker Image
The Dockerfile uses the official Python 3.11 slim image and installs PyTorch CPU-only wheels to minimize container size:
```bash
docker build -t teavision-ml-service:latest .
```

### 2. Run Container
Mount the directory containing your trained TorchScript model:
```bash
docker run -d \
  -p 8000:8000 \
  -v $(pwd)/../../ml/models:/app/models:ro \
  -e MODEL_PATH=/app/models/tea_grader.pt \
  -e ML_ENV=production \
  --name teavision-ml \
  teavision-ml-service:latest
```
