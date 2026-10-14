variable "name_prefix" {
  type        = string
  description = "Prefix applied to all ECS resources."
}

variable "project_name" {
  type        = string
  description = "Project name identifier used in logging and resource names."
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., staging, production)."
}

variable "aws_region" {
  type        = string
  description = "AWS region for log configuration and regional resources."
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where ECS tasks are deployed."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs where ECS Fargate tasks are launched."
}

variable "alb_security_group_id" {
  type        = string
  description = "Security group ID of the ALB to allow inbound traffic to ECS tasks."
}

variable "execution_role_arn" {
  type        = string
  description = "IAM role ARN used by the ECS container agent to pull images and fetch secrets."
}

variable "task_role_arn" {
  type        = string
  description = "IAM role ARN assumed by running ECS containers for AWS SDK requests."
}

variable "api_image" {
  type        = string
  description = "Docker image URI for the Go REST API container."
}

variable "ml_image" {
  type        = string
  description = "Docker image URI for the FastAPI ML inference container."
}

variable "web_image" {
  type        = string
  description = "Docker image URI for the Next.js web dashboard container."
}

variable "api_cpu" {
  type        = number
  default     = 512
  description = "Fargate CPU units allocated for the Go API task (e.g., 512 = 0.5 vCPU)."
}

variable "api_memory" {
  type        = number
  default     = 1024
  description = "Fargate memory in MB allocated for the Go API task."
}

variable "ml_cpu" {
  type        = number
  default     = 1024
  description = "Fargate CPU units allocated for the ML inference task."
}

variable "ml_memory" {
  type        = number
  default     = 2048
  description = "Fargate memory in MB allocated for the ML inference task."
}

variable "web_cpu" {
  type        = number
  default     = 256
  description = "Fargate CPU units allocated for the Web dashboard task."
}

variable "web_memory" {
  type        = number
  default     = 512
  description = "Fargate memory in MB allocated for the Web dashboard task."
}

variable "desired_count" {
  type        = number
  default     = 2
  description = "Desired number of running task instances per ECS service."
}

variable "api_target_group_arn" {
  type        = string
  description = "Target group ARN for routing traffic to the Go API service."
}

variable "ml_target_group_arn" {
  type        = string
  description = "Target group ARN for routing traffic to the ML service."
}

variable "web_target_group_arn" {
  type        = string
  description = "Target group ARN for routing traffic to the Web dashboard service."
}

variable "db_url_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for the PostgreSQL DATABASE_URL connection string."
}

variable "jwt_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for the JWT signing secret."
}

variable "nextauth_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for the NextAuth encryption secret."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags applied to ECS resources."
}
