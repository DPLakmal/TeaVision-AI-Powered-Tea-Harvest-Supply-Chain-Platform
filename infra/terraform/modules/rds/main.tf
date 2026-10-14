# ─── RDS DB Subnet Group ─────────────────────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name        = "${var.name_prefix}-db-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Private subnets database subnet group for TeaVision RDS"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-subnet-group"
    }
  )
}

# ─── RDS Security Group ──────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg"
  description = "Security group for TeaVision PostgreSQL RDS instance"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.ecs_security_group_id != "" ? [var.ecs_security_group_id] : []
    content {
      description     = "PostgreSQL access from ECS tasks"
      from_port       = 5432
      to_port         = 5432
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  egress {
    description = "Allow outbound communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-rds-sg"
    }
  )
}

# ─── RDS PostgreSQL Instance ─────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier                  = "${var.name_prefix}-postgres"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.db_instance_class
  allocated_storage           = var.allocated_storage
  max_allocated_storage       = var.max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  multi_az                    = var.environment == "production"
  publicly_accessible         = false
  auto_minor_version_upgrade  = true
  db_subnet_group_name        = aws_db_subnet_group.main.name
  vpc_security_group_ids      = [aws_security_group.rds.id]

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 5432

  backup_retention_period   = 7
  backup_window             = "03:00-04:00"
  maintenance_window        = "sun:04:30-sun:05:30"
  copy_tags_to_snapshot     = true
  deletion_protection       = var.environment == "production"
  skip_final_snapshot       = var.environment != "production"
  final_snapshot_identifier = "${var.name_prefix}-postgres-final-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-postgres"
      Environment = var.environment
    }
  )
}
