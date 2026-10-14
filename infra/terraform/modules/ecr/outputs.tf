output "repository_urls" {
  value = {
    for k, v in aws_ecr_repository.repos : k => v.repository_url
  }
  description = "Map of service names to their respective ECR repository URLs."
}

output "repository_arns" {
  value = {
    for k, v in aws_ecr_repository.repos : k => v.arn
  }
  description = "Map of service names to their respective ECR repository ARNs."
}

output "api_repository_url" {
  value       = aws_ecr_repository.repos["api"].repository_url
  description = "ECR repository URL for the Go API service."
}

output "ml_repository_url" {
  value       = aws_ecr_repository.repos["ml"].repository_url
  description = "ECR repository URL for the FastAPI ML inference service."
}

output "web_repository_url" {
  value       = aws_ecr_repository.repos["web"].repository_url
  description = "ECR repository URL for the Next.js web dashboard service."
}
