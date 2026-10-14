# ─── Staging Environment Configuration ───────────────────────────────────────
environment       = "staging"
aws_region        = "us-east-1"
project_name      = "teavision"
vpc_cidr          = "10.0.0.0/16"
db_instance_class = "db.t3.micro"
db_name           = "teavision"
db_username       = "teavision"

# Task Compute Allocations
api_cpu    = 256
api_memory = 512
ml_cpu     = 512
ml_memory  = 1024
web_cpu    = 256
web_memory = 512

desired_count = 1

# Image URIs: typically overridden dynamically via CI/CD (-var="api_image=...")
api_image = ""
ml_image  = ""
web_image = ""

# Domain & Certificate (Optional for staging; left empty to test via ALB/CloudFront default URLs)
domain_name     = ""
certificate_arn = ""
