output "db_instance_id" {
  value       = aws_db_instance.postgres.id
  description = "The RDS PostgreSQL instance identifier."
}

output "db_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "The connection endpoint (host:port) for PostgreSQL."
}

output "db_host" {
  value       = aws_db_instance.postgres.address
  description = "The hostname / DNS address of the RDS PostgreSQL instance."
}

output "db_port" {
  value       = aws_db_instance.postgres.port
  description = "The listening port of the PostgreSQL database instance."
}

output "db_name" {
  value       = aws_db_instance.postgres.db_name
  description = "The database name on the PostgreSQL instance."
}

output "db_security_group_id" {
  value       = aws_security_group.rds.id
  description = "The security group ID protecting the RDS instance."
}
