# Staging environment. Apply from this directory:
#   tofu init -backend-config=backend.hcl
#   tofu plan -var-file=terraform.tfvars
#   tofu apply -var-file=terraform.tfvars
# Provider credentials come from HCLOUD_TOKEN and CLOUDFLARE_API_TOKEN env vars.

terraform {
  required_version = ">= 1.8"
  backend "s3" {}
}

provider "hcloud" {}
provider "cloudflare" {}

module "environment" {
  source = "../../modules/environment"

  name                  = "staging"
  server_type           = var.server_type
  location              = var.location
  domain                = var.domain
  cloudflare_zone_id    = var.cloudflare_zone_id
  cloudflare_account_id = var.cloudflare_account_id
  ssh_public_key        = var.ssh_public_key
  allowed_ssh_cidrs     = var.allowed_ssh_cidrs
}

variable "server_type" {
  type    = string
  default = "cx22"
}
variable "location" {
  type    = string
  default = "fsn1"
}
variable "domain" { type = string }
variable "cloudflare_zone_id" { type = string }
variable "cloudflare_account_id" { type = string }
variable "ssh_public_key" { type = string }
variable "allowed_ssh_cidrs" { type = list(string) }

output "server_ipv4" { value = module.environment.server_ipv4 }
output "domain" { value = module.environment.domain }
output "uploads_bucket" { value = module.environment.uploads_bucket }
output "backups_bucket" { value = module.environment.backups_bucket }
