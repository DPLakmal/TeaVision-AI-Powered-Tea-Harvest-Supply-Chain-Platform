# 🍃 TeaVision — AWS Infrastructure as Code (Terraform)

Production-ready Terraform IaC provisioning a highly available, secure, and autoscaled AWS environment for TeaVision (Go REST API, PyTorch ML Inference Service, Next.js Web Dashboard, RDS PostgreSQL, and S3 Leaf Images).

---

## 🏛️ Architecture Overview

The Terraform configuration provisions:

- **VPC & Networking**: Multi-AZ VPC (`10.0.0.0/16`), 2 public subnets, 2 private subnets, Internet Gateway, and NAT Gateway.
- **Container Registry (ECR)**: 3 repositories (`teavision-api`, `teavision-ml`, `teavision-web`) with automated image scanning and lifecycle policies.
- **Load Balancing (ALB)**: Application Load Balancer with HTTP to HTTPS redirect, path-based routing (`/api/*` → Go API, `/ml/*` → FastAPI ML, `/swagger/*` → API Docs, `/` → Web Dashboard).
- **Compute (ECS Fargate)**: Serverless ECS Cluster running 3 Fargate services in private subnets with auto-recovery and CloudWatch logging.
- **Relational Database (RDS PostgreSQL 16)**: Multi-AZ PostgreSQL 16 database running in private isolated subnets with automatic encryption, storage autoscaling (20–100 GB GP3), and 7-day automated backups.
- **Object Storage (S3)**: Encrypted S3 bucket for tea leaf images with lifecycle transitions (Standard → Standard-IA after 90 days → Glacier after 365 days) and CORS configuration.
- **Content Delivery Network (CloudFront)**: Global edge CDN with dual origins (ALB for dynamic app traffic, S3 for images using Origin Access Control / OAC).
- **Secrets Management**: AWS Secrets Manager storing database credentials, JWT secrets, and NextAuth signing keys.
- **IAM**: Least-privilege execution and task IAM roles for ECS and CloudFront integration.

---

## 📋 Prerequisites

Before running Terraform:

1. **AWS CLI v2** installed and configured:
   ```bash
   aws --version
   aws configure
   ```
2. **Terraform CLI >= 1.7.0** installed:
   ```bash
   terraform -version
   ```
3. **AWS Permissions**: Administrator or appropriate power user permissions for VPC, EC2, ECS, ECR, RDS, S3, Secrets Manager, CloudFront, and IAM.

---

## 🪣 First-Time S3 Backend Setup

To store Terraform state remotely with state locking:

1. Create the S3 bucket and DynamoDB table (run once per AWS account/region):
   ```bash
   export AWS_REGION="us-east-1"
   export TF_STATE_BUCKET="teavision-terraform-state-$(aws sts get-caller-identity --query Account --output text)"

   # Create S3 bucket for state
   aws s3api create-bucket \
     --bucket "${TF_STATE_BUCKET}" \
     --region "${AWS_REGION}"

   # Enable versioning on state bucket
   aws s3api put-bucket-versioning \
     --bucket "${TF_STATE_BUCKET}" \
     --versioning-configuration Status=Enabled

   # Enable server-side encryption
   aws s3api put-bucket-encryption \
     --bucket "${TF_STATE_BUCKET}" \
     --server-side-encryption-configuration '{
       "Rules": [{ "ApplyServerSideEncryptionByDefault": { "SSEAlgorithm": "AES256" } }]
     }'

   # Block public access
   aws s3api put-public-access-block \
     --bucket "${TF_STATE_BUCKET}" \
     --public-access-block-configuration '{
       "BlockPublicAcls": true,
       "IgnorePublicAcls": true,
       "BlockPublicPolicy": true,
       "RestrictPublicBuckets": true
     }'
   ```

---

## 🚀 Deployment Guide

All commands should be executed from within `infra/terraform/`:

```bash
cd infra/terraform
```

### 1. Initialize Terraform

Initialize provider plugins and backend storage:

```bash
terraform init \
  -backend-config="bucket=${TF_STATE_BUCKET}" \
  -backend-config="key=teavision.tfstate" \
  -backend-config="region=us-east-1"
```

### 2. Deploying Staging Environment

Create or switch to the `staging` workspace:

```bash
terraform workspace select -or-create staging
```

Plan the deployment:

```bash
terraform plan \
  -var-file="environments/staging/terraform.tfvars" \
  -out=staging.tfplan
```

Apply the plan:

```bash
terraform apply staging.tfplan
```

### 3. Deploying Production Environment

Switch to the `production` workspace:

```bash
terraform workspace select -or-create production
```

Plan the deployment (providing the build container image tags):

```bash
terraform plan \
  -var-file="environments/production/terraform.tfvars" \
  -var="api_image=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/teavision-api:v1.0.0" \
  -var="ml_image=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/teavision-ml:v1.0.0" \
  -var="web_image=<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/teavision-web:v1.0.0" \
  -out=production.tfplan
```

Apply the production plan:

```bash
terraform apply production.tfplan
```

---

## 🔍 Inspecting Outputs

After applying the configuration, retrieve the provisioned endpoints:

```bash
# View all outputs
terraform output

# Retrieve specific endpoints
terraform output alb_dns_name
terraform output cloudfront_domain_name
terraform output rds_endpoint
terraform output ecr_repository_urls
```

---

## 🧹 Destroying Resources

> [!CAUTION]
> Destroying will terminate all running services, RDS database instances (final snapshot retained for production), and CloudFront distributions.

```bash
terraform workspace select staging
terraform destroy -var-file="environments/staging/terraform.tfvars"
```
