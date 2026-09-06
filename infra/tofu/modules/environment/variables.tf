variable "name" {
  description = "Environment name (staging | production). Used for resource names and labels."
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.name)
    error_message = "name must be staging or production."
  }
}

variable "server_type" {
  description = "Hetzner server type. cx22 = 2 vCPU / 4 GB x86; cax11 = 2 vCPU / 4 GB Arm."
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Hetzner location. fsn1 (Falkenstein) / nbg1 (Nuremberg) / hel1 (Helsinki) keep data in the EU."
  type        = string
  default     = "fsn1"
}

variable "image" {
  description = "OS image."
  type        = string
  default     = "ubuntu-24.04"
}

variable "domain" {
  description = "Fully-qualified hostname the app serves (e.g. staging.example.dev). Must be a name inside cloudflare_zone_id."
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Zone that owns var.domain."
  type        = string
}

variable "cloudflare_account_id" {
  description = "Account that owns the R2 bucket."
  type        = string
}

variable "ssh_public_key" {
  description = "OpenSSH public key for the `deploy` user (Kamal) - the ONLY way onto the box."
  type        = string
}

variable "allowed_ssh_cidrs" {
  description = "Source ranges allowed to reach port 22. Your own IP(s) and GitHub Actions if you deploy from there (or use a runner egress IP / Tailscale)."
  type        = list(string)
}

variable "extra_labels" {
  description = "Additional labels for all resources."
  type        = map(string)
  default     = {}
}
