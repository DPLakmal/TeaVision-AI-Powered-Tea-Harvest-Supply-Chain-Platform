output "bucket_id" {
  value       = aws_s3_bucket.leaf_images.id
  description = "The name / ID of the leaf images S3 bucket."
}

output "bucket_name" {
  value       = aws_s3_bucket.leaf_images.bucket
  description = "The name of the leaf images S3 bucket."
}

output "bucket_arn" {
  value       = aws_s3_bucket.leaf_images.arn
  description = "The ARN of the leaf images S3 bucket."
}

output "bucket_regional_domain_name" {
  value       = aws_s3_bucket.leaf_images.bucket_regional_domain_name
  description = "The regional domain name of the S3 bucket for CloudFront origin targeting."
}
