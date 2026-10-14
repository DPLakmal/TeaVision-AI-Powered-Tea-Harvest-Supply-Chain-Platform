terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    # Configured dynamically via CI/CD or CLI:
    # terraform init -backend-config="bucket=..." -backend-config="key=..." -backend-config="region=..."
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TeaVision"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
