output "cluster_id" {
  value       = aws_ecs_cluster.main.id
  description = "The ID of the ECS cluster."
}

output "cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "The name of the ECS cluster."
}

output "cluster_arn" {
  value       = aws_ecs_cluster.main.arn
  description = "The ARN of the ECS cluster."
}

output "ecs_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "The security group ID assigned to the ECS Fargate tasks."
}

output "api_service_name" {
  value       = aws_ecs_service.api.name
  description = "The name of the Go API ECS service."
}

output "ml_service_name" {
  value       = aws_ecs_service.ml.name
  description = "The name of the ML inference ECS service."
}

output "web_service_name" {
  value       = aws_ecs_service.web.name
  description = "The name of the Web dashboard ECS service."
}

output "api_task_definition_arn" {
  value       = aws_ecs_task_definition.api.arn
  description = "ARN of the Go API task definition."
}

output "ml_task_definition_arn" {
  value       = aws_ecs_task_definition.ml.arn
  description = "ARN of the ML inference task definition."
}

output "web_task_definition_arn" {
  value       = aws_ecs_task_definition.web.arn
  description = "ARN of the Web dashboard task definition."
}
