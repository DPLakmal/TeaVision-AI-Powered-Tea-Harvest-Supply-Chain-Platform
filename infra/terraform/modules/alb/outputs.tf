output "alb_id" {
  value       = aws_lb.main.id
  description = "The ID of the Application Load Balancer."
}

output "alb_arn" {
  value       = aws_lb.main.arn
  description = "The ARN of the Application Load Balancer."
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "The DNS name of the Application Load Balancer."
}

output "alb_zone_id" {
  value       = aws_lb.main.zone_id
  description = "The canonical hosted zone ID of the load balancer (used for Route53 alias records)."
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "The security group ID assigned to the Application Load Balancer."
}

output "api_target_group_arn" {
  value       = aws_lb_target_group.api.arn
  description = "ARN of the Go API target group."
}

output "ml_target_group_arn" {
  value       = aws_lb_target_group.ml.arn
  description = "ARN of the FastAPI ML inference target group."
}

output "web_target_group_arn" {
  value       = aws_lb_target_group.web.arn
  description = "ARN of the Next.js web dashboard target group."
}
