# ─── CloudWatch Log Groups ───────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project_name}-api"
  retention_in_days = 30

  tags = merge(
    var.tags,
    {
      Service = "api"
    }
  )
}

resource "aws_cloudwatch_log_group" "ml" {
  name              = "/ecs/${var.project_name}-ml"
  retention_in_days = 30

  tags = merge(
    var.tags,
    {
      Service = "ml"
    }
  )
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${var.project_name}-web"
  retention_in_days = 30

  tags = merge(
    var.tags,
    {
      Service = "web"
    }
  )
}

# ─── Go API Task Definition ──────────────────────────────────────────────────
resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project_name}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.api_cpu)
  memory                   = tostring(var.api_memory)
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "API_ENV", value = var.environment },
        { name = "API_PORT", value = "8080" },
        { name = "LOG_LEVEL", value = var.environment == "production" ? "info" : "debug" }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = var.db_url_secret_arn },
        { name = "JWT_SECRET", valueFrom = var.jwt_secret_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-api-task"
      Service = "api"
    }
  )
}

# ─── FastAPI ML Inference Task Definition ────────────────────────────────────
resource "aws_ecs_task_definition" "ml" {
  family                   = "${var.project_name}-ml"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.ml_cpu)
  memory                   = tostring(var.ml_memory)
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "ml"
      image     = var.ml_image
      essential = true
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "MODEL_PATH", value = "/app/models/tea_grader.pt" },
        { name = "ML_ENV", value = var.environment },
        { name = "ML_PORT", value = "8000" }
      ]
      secrets = []
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ml.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-ml-task"
      Service = "ml"
    }
  )
}

# ─── Next.js Web Dashboard Task Definition ───────────────────────────────────
resource "aws_ecs_task_definition" "web" {
  family                   = "${var.project_name}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.web_cpu)
  memory                   = tostring(var.web_memory)
  execution_role_arn       = var.execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = var.web_image
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "NODE_ENV", value = "production" }
      ]
      secrets = [
        { name = "NEXTAUTH_SECRET", valueFrom = var.nextauth_secret_arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = merge(
    var.tags,
    {
      Name    = "${var.project_name}-web-task"
      Service = "web"
    }
  )
}
