# ─── Production Environment Configuration ────────────────────────────────────
environment       = "production"
aws_region        = "us-east-1"
project_name      = "teavision"
vpc_cidr          = "10.0.0.0/16"
db_instance_class = "db.t3.medium"
db_name           = "teavision"
db_username       = "teavision"

# Task Compute Allocations
api_cpu    = 512
api_memory = 1024
ml_cpu     = 1024
ml_memory  = 2048
web_cpu    = 256
web_memory = 512

desired_count = 2

# Image URIs: typically overridden dynamically via CI/CD (-var="api_image=...")
api_image = ""
ml_image  = ""
web_image = ""

# Domain & Certificate (Set to production domain and ACM cert ARN)
domain_name     = "app.teavision.ai"
certificate_arn = ""
