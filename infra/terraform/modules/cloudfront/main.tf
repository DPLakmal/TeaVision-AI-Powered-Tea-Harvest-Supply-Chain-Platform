locals {
  alb_origin_id = "${var.name_prefix}-alb-origin"
  s3_origin_id  = "${var.name_prefix}-s3-images-origin"
}

# ─── S3 Origin Access Control (OAC) ──────────────────────────────────────────
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.name_prefix}-s3-oac"
  description                       = "OAC for securely accessing leaf images bucket via CloudFront"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ─── CloudFront CDN Distribution ─────────────────────────────────────────────
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "TeaVision Edge CDN for Web Dashboard and Leaf Images"
  price_class         = "PriceClass_100"
  aliases             = var.domain_name != "" ? [var.domain_name] : []

  # Origin 1: Application Load Balancer (Web Dashboard & APIs)
  origin {
    domain_name = var.alb_dns_name
    origin_id   = local.alb_origin_id

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "match-viewer"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_keepalive_timeout = 60
      origin_read_timeout      = 120
    }
  }

  # Origin 2: S3 Bucket (Leaf Images)
  origin {
    domain_name              = var.s3_bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  # ─── Default Cache Behavior (ALB / Next.js) ────────────────────────────────
  default_cache_behavior {
    target_origin_id       = local.alb_origin_id
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = true
      headers      = ["Host", "Authorization", "Accept", "Accept-Language", "Origin", "Referer"]

      cookies {
        forward = "all"
      }
    }

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # ─── Ordered Cache Behavior: Leaf Images (/images/*) ──────────────────────
  ordered_cache_behavior {
    path_pattern           = "/images/*"
    target_origin_id       = local.s3_origin_id
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400    # 24 hours
    max_ttl     = 31536000 # 365 days
  }

  # ─── Restrictions ──────────────────────────────────────────────────────────
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ─── SSL / TLS Certificate ────────────────────────────────────────────────
  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == ""
    acm_certificate_arn            = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method             = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.certificate_arn != "" ? "TLSv1.2_2021" : "TLSv1"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-cloudfront"
    }
  )
}

# ─── S3 Bucket Policy for CloudFront OAC ──────────────────────────────────────
data "aws_iam_policy_document" "s3_oac_policy" {
  statement {
    sid    = "AllowCloudFrontServicePrincipalReadOnly"
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    actions   = ["s3:GetObject"]
    resources = ["${var.s3_bucket_arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.main.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "leaf_images_oac" {
  bucket = var.s3_bucket_id
  policy = data.aws_iam_policy_document.s3_oac_policy.json
}
