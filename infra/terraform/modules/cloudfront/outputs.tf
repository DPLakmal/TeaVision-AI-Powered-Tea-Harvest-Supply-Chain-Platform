output "distribution_id" {
  value       = aws_cloudfront_distribution.main.id
  description = "The identifier of the CloudFront distribution."
}

output "distribution_arn" {
  value       = aws_cloudfront_distribution.main.arn
  description = "The ARN of the CloudFront distribution."
}

output "distribution_domain_name" {
  value       = aws_cloudfront_distribution.main.domain_name
  description = "The domain name of the CloudFront distribution (e.g. d1234567.cloudfront.net)."
}

output "hosted_zone_id" {
  value       = aws_cloudfront_distribution.main.hosted_zone_id
  description = "The CloudFront Route 53 zone ID for creating alias DNS records."
}
