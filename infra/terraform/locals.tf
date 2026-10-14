locals {
  name_prefix = "${var.project_name}-${var.environment}"

  s3_bucket_name = "${var.project_name}-leaf-images-${var.environment}"

  common_tags = {
    Project     = "TeaVision"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  # Image URI fallbacks to repository URLs if not explicitly passed during bootstrap
  api_image = var.api_image != "" ? var.api_image : "${module.ecr.api_repository_url}:latest"
  ml_image  = var.ml_image != "" ? var.ml_image : "${module.ecr.ml_repository_url}:latest"
  web_image = var.web_image != "" ? var.web_image : "${module.ecr.web_repository_url}:latest"
}
