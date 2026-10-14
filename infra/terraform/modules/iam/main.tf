# ─── ECS Trust Policy Document ───────────────────────────────────────────────
data "aws_iam_policy_document" "ecs_tasks_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ─── ECS Task Execution Role ─────────────────────────────────────────────────
# Used by ECS agent to pull container images and fetch secrets from Secrets Manager
resource "aws_iam_role" "ecs_execution_role" {
  name               = "${var.name_prefix}-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-execution-role"
    }
  )
}

# Attach AWS managed policy for standard ECS execution
resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Policy allowing ECS execution role to retrieve Secrets Manager secrets & decrypt
data "aws_iam_policy_document" "ecs_secrets_access" {
  statement {
    sid    = "AllowSecretsManagerAccess"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = var.secret_arns
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "${var.name_prefix}-ecs-secrets-policy"
  role   = aws_iam_role.ecs_execution_role.id
  policy = data.aws_iam_policy_document.ecs_secrets_access.json
}

# ─── ECS Task Role ───────────────────────────────────────────────────────────
# Assumed by the application containers themselves (Go API, ML, Web)
resource "aws_iam_role" "ecs_task_role" {
  name               = "${var.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_trust.json

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-ecs-task-role"
    }
  )
}

# Policy for S3 access and application runtime needs
data "aws_iam_policy_document" "ecs_task_policy" {
  dynamic "statement" {
    for_each = length(var.s3_bucket_arns) > 0 ? [1] : []
    content {
      sid    = "S3LeafImagesAccess"
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      resources = flatten([
        for arn in var.s3_bucket_arns : [arn, "${arn}/*"]
      ])
    }
  }

  statement {
    sid    = "CloudWatchMetricReporting"
    effect = "Allow"
    actions = [
      "cloudwatch:PutMetricData"
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_policy" {
  name   = "${var.name_prefix}-ecs-task-policy"
  role   = aws_iam_role.ecs_task_role.id
  policy = data.aws_iam_policy_document.ecs_task_policy.json
}
