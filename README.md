# 🍃 TeaVision — AI-Powered Tea Harvest & Supply Chain Platform

> End-to-end tea supply-chain intelligence: from leaf to buyer, powered by computer vision and real-time analytics.

[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?logo=go)](https://go.dev)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C?logo=pytorch)](https://pytorch.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)](https://nextjs.org)
[![Expo](https://img.shields.io/badge/Expo-51-000020?logo=expo)](https://expo.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)
[![AWS](https://img.shields.io/badge/AWS-ECS%20Fargate-FF9900?logo=amazon-aws)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/Terraform-IaC-7B42BC?logo=terraform)](https://terraform.io)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions)](https://github.com/features/actions)

---

## 🌟 Overview

**TeaVision** is a production-ready, full-stack tea supply-chain platform that combines:

- **AI-powered leaf quality grading** — MobileNetV3 / EfficientNet CNN fine-tuned for 3-class tea leaf classification
- **Go REST API** — JWT auth, RBAC, harvest operations, payroll, batch traceability
- **React Native field app** — Offline-first leaf photo capture, AI grading, harvest logging, auto-sync
- **Next.js analytics dashboard** — Yield, quality, worker, and payroll analytics
- **Full batch traceability** — Field → Processing → Factory → QC → Packaging → Buyer
- **Production AWS deployment** — ECS Fargate, RDS, S3, CloudFront via Terraform

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      AWS (Production)                    │
│  ┌─────────┐   ┌──────────────────┐   ┌─────────────┐  │
│  │CloudFront│   │   ALB            │   │  RDS PG 16  │  │
│  │(Next.js) │   │  /api → Go API   │   │  (multi-    │  │
│  └─────────┘   │  /ml  → FastAPI  │   │   schema)   │  │
│                └──────────────────┘   └─────────────┘  │
│  ┌──────────────────────────────────┐  ┌─────────────┐  │
│  │         ECS Fargate              │  │   S3 Bucket │  │
│  │  [api] [ml-service] [web]        │  │ (leaf imgs) │  │
│  └──────────────────────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────┘
           ▲                        ▲
           │                        │
   ┌───────────────┐      ┌────────────────────┐
   │  Next.js      │      │  React Native App  │
   │  Dashboard    │      │  (Expo, iOS+Android│
   │  (Browser)    │      │  Offline-first)    │
   └───────────────┘      └────────────────────┘
```

## 📦 Monorepo Structure

```
TeaVision/
├── services/
│   ├── api/          # Go REST API (chi, sqlx, JWT, goose)
│   ├── ml/           # FastAPI ML inference (PyTorch, TorchScript)
│   └── web/          # Next.js 14 analytics dashboard
├── apps/
│   └── field/        # React Native Expo field app
├── ml/
│   └── training/     # MobileNetV3/EfficientNet fine-tuning scripts
├── infra/
│   ├── terraform/    # AWS IaC (ECS, RDS, S3, CloudFront, ALB)
│   └── docker/       # Nginx config, helper Dockerfiles
├── .github/
│   └── workflows/    # CI/CD: test → build → push → deploy
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local with Docker Compose)

### Prerequisites
- Docker + Docker Compose v2
- Node.js 20+ (for Next.js dev)
- Go 1.22+ (for API dev)
- Python 3.11+ (for ML dev)
- Expo CLI (`npm install -g expo-cli`)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/teavision.git
cd teavision
cp .env.example .env   # fill in secrets
```

### 2. Run the Full Stack

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Go REST API | http://localhost:8080 |
| API Docs (Swagger) | http://localhost:8080/swagger/index.html |
| ML Inference Service | http://localhost:8000 |
| Next.js Dashboard | http://localhost:3000 |
| PostgreSQL | localhost:5432 |

### 3. Seed Initial Data

```bash
docker-compose exec api ./server seed
```

Default admin credentials: `admin@teavision.io` / `Admin@1234`

### 4. Run the Field App

```bash
cd apps/field
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone. Point the API URL to your machine's LAN IP.

---

## 🤖 AI Model — Tea Leaf Quality Classifier

### Dataset Preparation

Organize your dataset in 3-class folder structure:
```
dataset/
├── train/
│   ├── high_quality/   # ~1000+ images
│   ├── medium_quality/ # ~1000+ images
│   └── low_quality/    # ~1000+ images
└── val/
    ├── high_quality/
    ├── medium_quality/
    └── low_quality/
```

### Training

```bash
cd ml/training
pip install -r requirements.txt

# Phase 1: Train classifier head only (frozen backbone)
python train.py \
  --data-dir /path/to/dataset \
  --arch mobilenetv3  \
  --epochs 20 \
  --phase 1

# Phase 2: Full fine-tune (unfrozen backbone)
python train.py \
  --data-dir /path/to/dataset \
  --arch mobilenetv3 \
  --epochs 30 \
  --phase 2 \
  --checkpoint checkpoints/phase1_best.pth

# Evaluate
python evaluate.py --checkpoint checkpoints/phase2_best.pth --data-dir /path/to/dataset

# Export to TorchScript
python export.py --checkpoint checkpoints/phase2_best.pth --output ../models/tea_grader.pt
```

### Serving

Place `tea_grader.pt` in `ml/models/` and the ML service auto-loads it on startup.

---

## 🗄️ Database Schema

4 PostgreSQL schemas: `core`, `harvest`, `payroll`, `traceability`

Run migrations:
```bash
cd services/api
goose -dir migrations postgres "$DATABASE_URL" up
```

---

## ☁️ AWS Deployment

### Prerequisites
- AWS CLI configured
- Terraform 1.7+
- ECR repos created (auto via Terraform)

### Deploy

```bash
cd infra/terraform

# Staging
terraform workspace select staging
terraform apply -var-file=environments/staging/terraform.tfvars

# Production (requires manual approval in GitHub Actions)
terraform workspace select production
terraform apply -var-file=environments/production/terraform.tfvars
```

### CI/CD Pipeline

| Trigger | Action |
|---------|--------|
| Pull Request | Lint + unit tests (Go, Python, TypeScript) |
| Merge to `main` | Docker build → ECR push (api, ml, web) |
| After push | Terraform apply → ECS rolling deploy (staging auto, prod manual gate) |

---

## 👥 Roles & Access

| Role | Description |
|------|-------------|
| `admin` | Full access to all features |
| `supervisor` | Manage harvest sessions, view analytics |
| `field_worker` | Log own harvests, view own earnings |
| `factory_manager` | Advance batch stages, view factory analytics |
| `buyer` | View batch traceability for their deliveries |

---

## 📱 Field App Features

- 📷 **Camera capture** — leaf photo with auto-preview
- 🤖 **Instant AI grading** — grade + confidence shown in <2s
- ⚖️ **Weight logging** — harvest weight entry per lot
- 💾 **Offline-first** — full offline operation with SQLite local store
- 🔄 **Auto-sync** — background sync when network available; retry queue with back-off
- 🔒 **Secure auth** — JWT in Expo SecureStore

---

## 📊 Dashboard Features

- 📈 **Yield analytics** — daily/weekly/monthly harvest weight per garden
- 🍃 **Quality distribution** — donut chart + lot-level table with filters
- 👷 **Worker leaderboard** — individual harvest history
- 💰 **Payroll** — run payroll, view pay slips, CSV export
- 🔍 **Batch traceability** — full supply chain timeline with weight-loss % per stage

---

## 🧪 Testing

```bash
# Go API tests
cd services/api && go test ./... -v -cover

# ML service tests
cd services/ml && pytest tests/ -v

# Next.js build check
cd services/web && npm run build

# Expo TypeScript check
cd apps/field && npx expo typecheck
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

*Built with ❤️ for sustainable tea agriculture.*
