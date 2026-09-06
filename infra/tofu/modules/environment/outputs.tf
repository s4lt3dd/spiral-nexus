output "server_ipv4" {
  description = "Public IPv4 - export as KAMAL_WEB_HOST."
  value       = hcloud_server.web.ipv4_address
}

output "server_ipv6" {
  value = hcloud_server.web.ipv6_address
}

output "domain" {
  description = "App hostname - export as KAMAL_APP_HOST."
  value       = var.domain
}

output "uploads_bucket" {
  value = cloudflare_r2_bucket.uploads.name
}

output "backups_bucket" {
  value = cloudflare_r2_bucket.backups.name
}

output "server_id" {
  value = hcloud_server.web.id
}
