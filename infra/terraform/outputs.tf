# ─── Networking Outputs ──────────────────────────────────────────────────────
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "The VPC ID provisioned for TeaVision."
}

output "public_subnet_ids" {
  value       = module.vpc.public_subnet_ids
  description = "The list of public subnet IDs in the VPC."
}

output "private_subnet_ids" {
  value       = module.vpc.private_subnet_ids
  description = "The list of private subnet IDs in the VPC."
}

# ─── Load Balancing & CDN Outputs ────────────────────────────────────────────
output "alb_dns_name" {
  value       = module.alb.alb_dns_name
  description = "The internet-facing DNS name of the Application Load Balancer."
}

output "alb_arn" {
  value       = module.alb.alb_arn
  description = "The Amazon Resource Name (ARN) of the Application Load Balancer."
}

output "cloudfront_domain_name" {
  value       = module.cloudfront.distribution_domain_name
  description = "The CloudFront CDN domain name serving the web application and S3 images."
}

output "cloudfront_distribution_id" {
  value       = module.cloudfront.distribution_id
  description = "The identifier of the CloudFront distribution."
}

# ─── Database Outputs ────────────────────────────────────────────────────────
output "rds_endpoint" {
  value       = module.rds.db_endpoint
  description = "The connection endpoint for the RDS PostgreSQL database."
}

output "rds_host" {
  value       = module.rds.db_host
  description = "The hostname of the RDS PostgreSQL database."
}

output "rds_port" {
  value       = module.rds.db_port
  description = "The network port of the RDS PostgreSQL database."
}

output "rds_database_name" {
  value       = module.rds.db_name
  description = "The database name created within the RDS instance."
}

# ─── ECR Outputs ─────────────────────────────────────────────────────────────
output "ecr_repository_urls" {
  value       = module.ecr.repository_urls
  description = "Map of ECR repository URLs for api, ml, and web images."
}

output "api_ecr_url" {
  value       = module.ecr.api_repository_url
  description = "ECR repository URL for the Go REST API container image."
}

output "ml_ecr_url" {
  value       = module.ecr.ml_repository_url
  description = "ECR repository URL for the FastAPI ML inference container image."
}

output "web_ecr_url" {
  value       = module.ecr.web_repository_url
  description = "ECR repository URL for the Next.js web dashboard container image."
}

# ─── Storage Outputs ─────────────────────────────────────────────────────────
output "s3_leaf_images_bucket_name" {
  value       = module.s3.bucket_name
  description = "Name of the S3 bucket storing leaf images and inference inputs."
}

output "s3_leaf_images_bucket_arn" {
  value       = module.s3.bucket_arn
  description = "ARN of the S3 bucket storing leaf images."
}

# ─── ECS Compute Outputs ─────────────────────────────────────────────────────
output "ecs_cluster_name" {
  value       = module.ecs.cluster_name
  description = "Name of the ECS Fargate cluster."
}

output "ecs_cluster_arn" {
  value       = module.ecs.cluster_arn
  description = "ARN of the ECS Fargate cluster."
}

output "api_service_name" {
  value       = module.ecs.api_service_name
  description = "Name of the Go API ECS Fargate service."
}

output "ml_service_name" {
  value       = module.ecs.ml_service_name
  description = "Name of the ML inference ECS Fargate service."
}

output "web_service_name" {
  value       = module.ecs.web_service_name
  description = "Name of the Web dashboard ECS Fargate service."
}
