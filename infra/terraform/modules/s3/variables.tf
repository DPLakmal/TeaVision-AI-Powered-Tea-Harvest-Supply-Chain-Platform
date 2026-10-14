variable "bucket_name" {
  type        = string
  description = "The globally unique name of the S3 bucket for storing leaf images."
}

variable "cors_allowed_origins" {
  type        = list(string)
  default     = ["*"]
  description = "List of origins allowed to perform CORS requests against the S3 bucket."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to S3 bucket resources."
}
