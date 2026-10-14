variable "name_prefix" {
  type        = string
  description = "Prefix applied to CloudFront resources."
}

variable "alb_dns_name" {
  type        = string
  description = "The DNS name of the Application Load Balancer used as the custom origin for web traffic."
}

variable "s3_bucket_id" {
  type        = string
  description = "The ID of the S3 bucket storing leaf images."
}

variable "s3_bucket_arn" {
  type        = string
  description = "The ARN of the S3 bucket storing leaf images."
}

variable "s3_bucket_regional_domain_name" {
  type        = string
  description = "The regional domain name of the S3 bucket used as an origin for images."
}

variable "domain_name" {
  type        = string
  default     = ""
  description = "Optional custom domain name (e.g., app.teavision.ai). If blank, uses CloudFront generated domain."
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ACM certificate ARN for custom domain (must be issued in us-east-1 for CloudFront)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to CloudFront distribution resources."
}
