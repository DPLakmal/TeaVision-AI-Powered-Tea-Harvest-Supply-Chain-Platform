variable "name_prefix" {
  type        = string
  description = "Prefix applied to RDS resources."
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., staging, production)."
}

variable "vpc_id" {
  type        = string
  description = "The ID of the VPC where RDS will be placed."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs for the RDS database subnet group."
}

variable "ecs_security_group_id" {
  type        = string
  default     = ""
  description = "Optional security group ID of ECS tasks allowed to connect to PostgreSQL (can alternatively be managed via standalone aws_security_group_rule)."
}

variable "db_instance_class" {
  type        = string
  default     = "db.t3.medium"
  description = "The compute instance class for the RDS database."
}

variable "db_name" {
  type        = string
  default     = "teavision"
  description = "The initial PostgreSQL database name."
}

variable "db_username" {
  type        = string
  default     = "teavision"
  description = "The master username for the PostgreSQL database."
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "The master password for the PostgreSQL database."
}

variable "allocated_storage" {
  type        = number
  default     = 20
  description = "Allocated storage size in gigabytes (GB)."
}

variable "max_allocated_storage" {
  type        = number
  default     = 100
  description = "Maximum storage limit in gigabytes for autoscaling."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all RDS resources."
}
