output "ecs_execution_role_arn" {
  value       = aws_iam_role.ecs_execution_role.arn
  description = "ARN of the ECS task execution IAM role."
}

output "ecs_execution_role_name" {
  value       = aws_iam_role.ecs_execution_role.name
  description = "Name of the ECS task execution IAM role."
}

output "ecs_task_role_arn" {
  value       = aws_iam_role.ecs_task_role.arn
  description = "ARN of the ECS task IAM role."
}

output "ecs_task_role_name" {
  value       = aws_iam_role.ecs_task_role.name
  description = "Name of the ECS task IAM role."
}
