variable "name_prefix" {
  type        = string
  description = "Prefix applied to IAM role and policy names."
}

variable "secret_arns" {
  type        = list(string)
  default     = ["*"]
  description = "List of Secrets Manager ARNs the ECS task execution role is authorized to read."
}

variable "s3_bucket_arns" {
  type        = list(string)
  default     = []
  description = "List of S3 bucket ARNs the ECS task role is authorized to access."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all IAM resources."
}
