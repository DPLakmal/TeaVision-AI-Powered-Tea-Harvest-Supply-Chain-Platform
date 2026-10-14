output "db_password_secret_arn" {
  value       = aws_secretsmanager_secret.db_password.arn
  description = "ARN of the Secrets Manager secret for the RDS database password."
}

output "jwt_secret_arn" {
  value       = aws_secretsmanager_secret.jwt_secret.arn
  description = "ARN of the Secrets Manager secret for the Go API JWT signing key."
}

output "nextauth_secret_arn" {
  value       = aws_secretsmanager_secret.nextauth_secret.arn
  description = "ARN of the Secrets Manager secret for the NextAuth session encryption key."
}

output "db_password" {
  value       = random_password.db_password.result
  sensitive   = true
  description = "The generated RDS database master password."
}

output "jwt_secret" {
  value       = random_password.jwt_secret.result
  sensitive   = true
  description = "The generated JWT signing secret."
}

output "nextauth_secret" {
  value       = random_password.nextauth_secret.result
  sensitive   = true
  description = "The generated NextAuth secret."
}
