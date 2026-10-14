# ─── ALB Security Group ──────────────────────────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb-sg"
  description = "Security group for TeaVision Application Load Balancer"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP inbound from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS inbound from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-alb-sg"
    }
  )
}

# ─── Application Load Balancer ───────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = substr("${var.name_prefix}-alb", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-alb"
    }
  )
}

# ─── Target Groups ───────────────────────────────────────────────────────────
# Web Target Group (Next.js - Port 3000)
resource "aws_lb_target_group" "web" {
  name        = substr("${var.name_prefix}-tg-web", 0, 32)
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/auth/session"
    protocol            = "HTTP"
    port                = "3000"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200,302,307,308"
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.name_prefix}-tg-web"
      Service = "web"
    }
  )
}

# API Target Group (Go REST API - Port 8080)
resource "aws_lb_target_group" "api" {
  name        = substr("${var.name_prefix}-tg-api", 0, 32)
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    port                = "8080"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-299"
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.name_prefix}-tg-api"
      Service = "api"
    }
  )
}

# ML Target Group (FastAPI ML - Port 8000)
resource "aws_lb_target_group" "ml" {
  name        = substr("${var.name_prefix}-tg-ml", 0, 32)
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/health"
    protocol            = "HTTP"
    port                = "8000"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200-299"
  }

  tags = merge(
    var.tags,
    {
      Name    = "${var.name_prefix}-tg-ml"
      Service = "ml"
    }
  )
}

# ─── Listeners ───────────────────────────────────────────────────────────────
# HTTP Listener (Port 80)
# If certificate_arn is supplied, redirects HTTP traffic to HTTPS.
# If no certificate_arn is supplied (e.g. testing staging without custom domain), forwards directly to web target group.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.certificate_arn != "" ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.certificate_arn == "" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.web.arn
    }
  }
}

# HTTPS Listener (Port 443, when certificate_arn is provided)
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# ─── Listener Rules ──────────────────────────────────────────────────────────
# Active listener ARN is HTTPS if configured, otherwise HTTP
locals {
  primary_listener_arn = var.certificate_arn != "" ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}

resource "aws_lb_listener_rule" "api_routing" {
  listener_arn = local.primary_listener_arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "ml_routing" {
  listener_arn = local.primary_listener_arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ml.arn
  }

  condition {
    path_pattern {
      values = ["/ml/*"]
    }
  }
}

resource "aws_lb_listener_rule" "swagger_routing" {
  listener_arn = local.primary_listener_arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/swagger/*"]
    }
  }
}
