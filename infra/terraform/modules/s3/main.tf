# ─── S3 Leaf Images Bucket ───────────────────────────────────────────────────
resource "aws_s3_bucket" "leaf_images" {
  bucket        = var.bucket_name
  force_destroy = false

  tags = merge(
    var.tags,
    {
      Name    = var.bucket_name
      Purpose = "TeaVision leaf photo captures and ML inference assets"
    }
  )
}

# ─── Public Access Block ─────────────────────────────────────────────────────
resource "aws_s3_bucket_public_access_block" "leaf_images" {
  bucket = aws_s3_bucket.leaf_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ─── Versioning ──────────────────────────────────────────────────────────────
resource "aws_s3_bucket_versioning" "leaf_images" {
  bucket = aws_s3_bucket.leaf_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ─── Server-Side Encryption ──────────────────────────────────────────────────
resource "aws_s3_bucket_server_side_encryption_configuration" "leaf_images" {
  bucket = aws_s3_bucket.leaf_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ─── Lifecycle Rules ─────────────────────────────────────────────────────────
# Move to STANDARD_IA after 90 days, GLACIER after 365 days
resource "aws_s3_bucket_lifecycle_configuration" "leaf_images" {
  bucket = aws_s3_bucket.leaf_images.id

  rule {
    id     = "archive-aged-leaf-images"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# ─── CORS Configuration ──────────────────────────────────────────────────────
resource "aws_s3_bucket_cors_configuration" "leaf_images" {
  bucket = aws_s3_bucket.leaf_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}
