variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "Target AWS region for deploying all infrastructure resources."
}

variable "environment" {
  type        = string
  description = "Deployment target environment (staging or production)."
}

variable "project_name" {
  type        = string
  default     = "teavision"
  description = "Base project name used in resource naming conventions."
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block range assigned to the VPC."
}

variable "db_instance_class" {
  type        = string
  default     = "db.t3.medium"
  description = "RDS database compute instance type."
}

variable "db_name" {
  type        = string
  default     = "teavision"
  description = "The database name to create on the PostgreSQL RDS instance."
}

variable "db_username" {
  type        = string
  default     = "teavision"
  description = "Master username for the PostgreSQL database."
}

variable "api_cpu" {
  type        = number
  default     = 512
  description = "CPU units allocated to the Go REST API Fargate task."
}

variable "api_memory" {
  type        = number
  default     = 1024
  description = "Memory in MB allocated to the Go REST API Fargate task."
}

variable "ml_cpu" {
  type        = number
  default     = 1024
  description = "CPU units allocated to the FastAPI ML inference Fargate task."
}

variable "ml_memory" {
  type        = number
  default     = 2048
  description = "Memory in MB allocated to the FastAPI ML inference Fargate task."
}

variable "web_cpu" {
  type        = number
  default     = 256
  description = "CPU units allocated to the Next.js web dashboard Fargate task."
}

variable "web_memory" {
  type        = number
  default     = 512
  description = "Memory in MB allocated to the Next.js web dashboard Fargate task."
}

variable "desired_count" {
  type        = number
  default     = 2
  description = "Number of running container tasks desired for each ECS service."
}

variable "api_image" {
  type        = string
  default     = ""
  description = "Docker image URI in ECR for the Go REST API container."
}

variable "ml_image" {
  type        = string
  default     = ""
  description = "Docker image URI in ECR for the FastAPI ML inference container."
}

variable "web_image" {
  type        = string
  default     = ""
  description = "Docker image URI in ECR for the Next.js web dashboard container."
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Custom domain name (e.g., app.teavision.ai) for CloudFront / Route 53."
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN for SSL termination on ALB and CloudFront."
}
