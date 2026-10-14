# ─── VPC & Networking Module ────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  name_prefix = local.name_prefix
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
  tags        = local.common_tags
}

# ─── ECR Repositories Module ─────────────────────────────────────────────────
module "ecr" {
  source = "./modules/ecr"

  name_prefix = var.project_name
  tags        = local.common_tags
}

# ─── S3 Leaf Images Bucket Module ────────────────────────────────────────────
module "s3" {
  source = "./modules/s3"

  bucket_name          = local.s3_bucket_name
  cors_allowed_origins = ["*"]
  tags                 = local.common_tags
}

# ─── Secrets Manager Module ──────────────────────────────────────────────────
module "secrets" {
  source = "./modules/secrets"

  name_prefix             = local.name_prefix
  recovery_window_in_days = var.environment == "production" ? 7 : 0
  tags                    = local.common_tags
}

# ─── Application Load Balancer Module ────────────────────────────────────────
module "alb" {
  source = "./modules/alb"

  name_prefix       = local.name_prefix
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = var.certificate_arn
  tags              = local.common_tags
}

# ─── RDS PostgreSQL Database Module ──────────────────────────────────────────
module "rds" {
  source = "./modules/rds"

  name_prefix        = local.name_prefix
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  db_instance_class  = var.db_instance_class
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = module.secrets.db_password
  tags               = local.common_tags
}

# ─── Database URL Secret (Constructed from RDS & Secrets) ────────────────────
resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${local.name_prefix}-database-url"
  recovery_window_in_days = var.environment == "production" ? 7 : 0

  tags = merge(
    local.common_tags,
    {
      Name = "${local.name_prefix}-database-url"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id = aws_secretsmanager_secret.db_url.id
  secret_string = format(
    "postgres://%s:%s@%s:%s/%s?sslmode=require",
    var.db_username,
    module.secrets.db_password,
    module.rds.db_host,
    module.rds.db_port,
    module.rds.db_name
  )
}

# ─── IAM Roles & Policies Module ─────────────────────────────────────────────
module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix
  secret_arns = [
    module.secrets.db_password_secret_arn,
    module.secrets.jwt_secret_arn,
    module.secrets.nextauth_secret_arn,
    aws_secretsmanager_secret.db_url.arn
  ]
  s3_bucket_arns = [module.s3.bucket_arn]
  tags           = local.common_tags
}

# ─── ECS Cluster & Fargate Services Module ───────────────────────────────────
module "ecs" {
  source = "./modules/ecs"

  name_prefix           = local.name_prefix
  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.alb_security_group_id
  execution_role_arn    = module.iam.ecs_execution_role_arn
  task_role_arn         = module.iam.ecs_task_role_arn
  api_image             = local.api_image
  ml_image              = local.ml_image
  web_image             = local.web_image
  api_cpu               = var.api_cpu
  api_memory            = var.api_memory
  ml_cpu                = var.ml_cpu
  ml_memory             = var.ml_memory
  web_cpu               = var.web_cpu
  web_memory            = var.web_memory
  desired_count         = var.desired_count
  api_target_group_arn  = module.alb.api_target_group_arn
  ml_target_group_arn   = module.alb.ml_target_group_arn
  web_target_group_arn  = module.alb.web_target_group_arn
  db_url_secret_arn     = aws_secretsmanager_secret.db_url.arn
  jwt_secret_arn        = module.secrets.jwt_secret_arn
  nextauth_secret_arn   = module.secrets.nextauth_secret_arn
  tags                  = local.common_tags
}

# ─── Security Group Rule: Allow ECS Tasks Ingress to RDS ─────────────────────
resource "aws_security_group_rule" "rds_from_ecs" {
  type                     = "ingress"
  description              = "Allow PostgreSQL inbound traffic from ECS tasks"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.rds.db_security_group_id
  source_security_group_id = module.ecs.ecs_security_group_id
}

# ─── CloudFront CDN Distribution Module ──────────────────────────────────────
module "cloudfront" {
  source = "./modules/cloudfront"

  name_prefix                    = local.name_prefix
  alb_dns_name                   = module.alb.alb_dns_name
  s3_bucket_id                   = module.s3.bucket_id
  s3_bucket_arn                  = module.s3.bucket_arn
  s3_bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  domain_name                    = var.domain_name
  certificate_arn                = var.certificate_arn
  tags                           = local.common_tags
}
