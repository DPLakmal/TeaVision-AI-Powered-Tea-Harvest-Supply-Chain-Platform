variable "name_prefix" {
  type        = string
  description = "Prefix applied to all VPC resources for identification and environment separation."
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g., staging, production)."
}

variable "vpc_cidr" {
  type        = string
  default     = "10.0.0.0/16"
  description = "CIDR block for the VPC network."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags applied to all VPC infrastructure components."
}
