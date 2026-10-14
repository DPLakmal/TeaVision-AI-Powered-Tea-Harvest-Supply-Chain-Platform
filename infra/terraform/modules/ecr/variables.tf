variable "name_prefix" {
  type        = string
  description = "Prefix applied to repository names."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all ECR repositories."
}

variable "image_retention_count" {
  type        = number
  default     = 30
  description = "Number of tagged images to retain per repository before lifecycle expiration."
}
