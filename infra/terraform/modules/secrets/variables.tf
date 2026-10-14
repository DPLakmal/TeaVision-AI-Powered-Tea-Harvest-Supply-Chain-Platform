variable "name_prefix" {
  type        = string
  description = "Prefix applied to all secret names."
}

variable "recovery_window_in_days" {
  type        = number
  default     = 0
  description = "Number of days AWS Secrets Manager waits before deleting secrets (0 for immediate deletion)."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Tags applied to all Secrets Manager resources."
}
