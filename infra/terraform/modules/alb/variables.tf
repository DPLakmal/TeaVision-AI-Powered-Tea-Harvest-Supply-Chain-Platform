variable "name_prefix" {
  type        = string
  description = "Prefix applied to ALB resources."
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., staging, production)."
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC where the ALB and Target Groups will be deployed."
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs for placing the internet-facing Application Load Balancer."
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "Optional ACM certificate ARN for enabling HTTPS termination on port 443."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all ALB resources."
}
