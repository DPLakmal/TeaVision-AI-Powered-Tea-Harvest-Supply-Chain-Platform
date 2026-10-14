locals {
  repositories = toset(["api", "ml", "web"])
}

# ─── ECR Repositories ────────────────────────────────────────────────────────
resource "aws_ecr_repository" "repos" {
  for_each             = local.repositories
  name                 = "${var.name_prefix}-${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.name_prefix}-${each.key}"
      Service = each.key
    }
  )
}

# ─── Lifecycle Policy ────────────────────────────────────────────────────────
resource "aws_ecr_lifecycle_policy" "repos_policy" {
  for_each   = local.repositories
  repository = aws_ecr_repository.repos[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 14 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 14
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Retain latest ${var.image_retention_count} tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha-", "release", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = var.image_retention_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
