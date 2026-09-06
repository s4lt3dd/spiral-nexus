# One Spiral Nexus environment: a Hetzner VM behind a Cloudflare-proxied DNS
# record, with a firewall that admits HTTP(S) only from Cloudflare's edge and
# SSH only from allowed ranges, plus an R2 bucket for uploads and backups.
# Instantiated once per environment from infra/tofu/envs/<name>.

locals {
  labels = merge(
    {
      project     = "spiral-nexus"
      environment = var.name
      managed_by  = "opentofu"
    },
    var.extra_labels,
  )
}

# ---- Cloudflare edge IP ranges (so the origin only talks to Cloudflare) ----
data "http" "cloudflare_ipv4" {
  url = "https://www.cloudflare.com/ips-v4"
}

data "http" "cloudflare_ipv6" {
  url = "https://www.cloudflare.com/ips-v6"
}

locals {
  cloudflare_ranges = concat(
    compact(split("\n", trimspace(data.http.cloudflare_ipv4.response_body))),
    compact(split("\n", trimspace(data.http.cloudflare_ipv6.response_body))),
  )
}

# ---- SSH key -------------------------------------------------------------
resource "hcloud_ssh_key" "deploy" {
  name       = "spiral-nexus-${var.name}-deploy"
  public_key = var.ssh_public_key
  labels     = local.labels
}

# ---- Firewall -----------------------------------------------------------
resource "hcloud_firewall" "web" {
  name   = "spiral-nexus-${var.name}"
  labels = local.labels

  rule {
    description = "SSH from allowed ranges only"
    direction   = "in"
    protocol    = "tcp"
    port        = "22"
    source_ips  = var.allowed_ssh_cidrs
  }

  rule {
    description = "HTTP from Cloudflare edge (ACME + redirect to HTTPS)"
    direction   = "in"
    protocol    = "tcp"
    port        = "80"
    source_ips  = local.cloudflare_ranges
  }

  rule {
    description = "HTTPS from Cloudflare edge"
    direction   = "in"
    protocol    = "tcp"
    port        = "443"
    source_ips  = local.cloudflare_ranges
  }

  rule {
    description = "ICMP (path MTU, diagnostics)"
    direction   = "in"
    protocol    = "icmp"
    source_ips  = ["0.0.0.0/0", "::/0"]
  }
  # Everything else inbound is dropped, including 5432 (Postgres) and 3000.
}

# ---- Server -------------------------------------------------------------
resource "hcloud_server" "web" {
  name         = "spiral-nexus-${var.name}"
  server_type  = var.server_type
  image        = var.image
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.deploy.id]
  firewall_ids = [hcloud_firewall.web.id]
  labels       = local.labels

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  user_data = templatefile("${path.module}/../../../cloud-init/server.yaml.tftpl", {
    ssh_public_key = var.ssh_public_key
    environment    = var.name
  })

  # Hetzner-side snapshots are a belt-and-braces layer under the WAL backups.
  backups = var.name == "production"

  lifecycle {
    # cloud-init only runs on first boot; changing it must not rebuild prod.
    ignore_changes = [user_data]
  }
}

# ---- DNS (proxied through Cloudflare) ------------------------------------
resource "cloudflare_dns_record" "app_v4" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "A"
  content = hcloud_server.web.ipv4_address
  proxied = true
  ttl     = 1
  comment = "spiral-nexus ${var.name} (opentofu)"
}

resource "cloudflare_dns_record" "app_v6" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain
  type    = "AAAA"
  content = hcloud_server.web.ipv6_address
  proxied = true
  ttl     = 1
  comment = "spiral-nexus ${var.name} (opentofu)"
}

# ---- Object storage (uploads + WAL/base backups) -------------------------
resource "cloudflare_r2_bucket" "uploads" {
  account_id = var.cloudflare_account_id
  name       = "spiral-nexus-${var.name}-uploads"
  location   = "WEUR"
}

resource "cloudflare_r2_bucket" "backups" {
  account_id = var.cloudflare_account_id
  name       = "spiral-nexus-${var.name}-backups"
  location   = "WEUR"
}
