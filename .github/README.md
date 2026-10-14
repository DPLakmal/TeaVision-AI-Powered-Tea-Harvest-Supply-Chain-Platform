# 🚀 TeaVision CI/CD Pipeline & GitHub Actions Documentation

This directory contains the automated Continuous Integration and Continuous Deployment (CI/CD) pipelines for the TeaVision platform.

---

## 🏗️ 3-Workflow Architecture

```
 Pull Request (main / develop)
   │
   ▼
┌──────────────────────────────────────────────┐
│  1. CI (ci.yml)                              │
│  - Go API tests + test coverage (PostgreSQL) │
│  - FastAPI ML inference pytest               │
│  - Next.js Web typecheck + lint + build      │
│  - React Native field app typecheck          │
└──────────────────────────────────────────────┘

 Push to main
   │
   ▼
┌──────────────────────────────────────────────┐
│  2. Build & Push (build-push.yml)            │
│  - Matrix build: api, ml, web                │
│  - Multi-arch Docker images (amd64 / arm64)  │
│  - Authenticate to ECR via AWS OIDC          │
│  - Push image tags: ${GIT_SHA} and latest    │
└──────────────────────────────────────────────┘
   │
   ▼ (on success)
┌──────────────────────────────────────────────┐
│  3. Deploy (deploy.yml)                      │
│  - Staging: Automated Terraform apply        │
│    + Zero-downtime rolling ECS update        │
│  - Production: Approval gate via GitHub      │
│    Environment Protection Rules              │
│    + Terraform apply + ECS update            │
└──────────────────────────────────────────────┘
```

---

## 🔐 Setting Up AWS OIDC for GitHub Actions

TeaVision uses **OpenID Connect (OIDC)** to authenticate GitHub Actions directly with AWS IAM, eliminating the need for long-lived, high-risk AWS Access Keys.

### 1. Create the OIDC Identity Provider in AWS

Run via AWS CLI:

```bash
# Add GitHub Actions OIDC Provider
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 1c5878a6700195a940428d70b7468205fbc08447
```

### 2. Create the IAM Role for GitHub Actions

Create a trust policy file `github-oidc-trust.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<YOUR_GITHUB_ORG_OR_USER>/TeaVision*:*"
        }
      }
    }
  ]
}
```

Create the IAM role and attach necessary deployment permissions:

```bash
aws iam create-role \
  --role-name teavision-github-actions-role \
  --assume-role-policy-document file://github-oidc-trust.json

# Attach PowerUser or custom deployment policy
aws iam attach-role-policy \
  --role-name teavision-github-actions-role \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

Copy the role ARN:
`arn:aws:iam::<ACCOUNT_ID>:role/teavision-github-actions-role`

---

## 🛡️ Configuring GitHub Environments

To enforce safety gates for production releases:

1. Navigate to **GitHub Repository** → **Settings** → **Environments**.
2. Click **New environment** and create:
   - `staging`
   - `production`
3. In the `production` environment:
   - Check **Required reviewers** under **Deployment protection rules**.
   - Add platform engineers or repository admins as designated approvers.
   - Optionally configure **Deployment branches** to restrict deployments exclusively to `main`.

---

## 🔑 Required Repository Secrets & Variables

Navigate to **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions** and configure the following:

| Secret Name | Description | Example / Default |
| :--- | :--- | :--- |
| `AWS_ROLE_ARN` | IAM Role ARN for GitHub Actions OIDC | `arn:aws:iam::123456789012:role/teavision-github-actions-role` |
| `AWS_REGION` | Target AWS deployment region | `us-east-1` |
| `ECR_REGISTRY` | AWS ECR Registry URI prefix | `123456789012.dkr.ecr.us-east-1.amazonaws.com` |
| `TF_BACKEND_BUCKET` | S3 bucket storing Terraform remote state | `teavision-terraform-state-123456789012` |
| `TF_BACKEND_REGION` | AWS region of the state S3 bucket | `us-east-1` |
| `NEXTAUTH_SECRET` | Secret key used to encrypt NextAuth JWT sessions | `a9f4e2...32_chars_minimum` |
| `JWT_SECRET` | Secret key used for signing Go REST API JWTs | `b3e8c1...32_chars_minimum` |

---

## 🛠️ Local Workflow Testing

To test workflows locally prior to pushing:

```bash
# Test Go API unit tests
cd services/api && go test -v ./...

# Test ML inference service
cd services/ml && pytest -v

# Typecheck Web dashboard
cd services/web && npx tsc --noEmit && npm run build

# Typecheck Field mobile app
cd apps/field && npx tsc --noEmit
```
