# ─── Random Secrets Generation ──────────────────────────────────────────────
resource "random_password" "db_password" {
  length           = 24
  special          = true
  # Exclude characters that could cause URL encoding conflicts in DATABASE_URL
  override_special = "!#%&*()-_=+[]{}<>:?"
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "random_password" "nextauth_secret" {
  length  = 48
  special = false
}

# ─── RDS Database Password Secret ────────────────────────────────────────────
resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.name_prefix}-db-password"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-password"
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# ─── Go API JWT Secret ───────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.name_prefix}-jwt-secret"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-jwt-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# ─── NextAuth Secret ─────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "nextauth_secret" {
  name                    = "${var.name_prefix}-nextauth-secret"
  recovery_window_in_days = var.recovery_window_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-nextauth-secret"
    }
  )
}

resource "aws_secretsmanager_secret_version" "nextauth_secret" {
  secret_id     = aws_secretsmanager_secret.nextauth_secret.id
  secret_string = random_password.nextauth_secret.result
}
