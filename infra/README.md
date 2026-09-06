# Infrastructure

Self-hosted target from `docs/TARGET-ARCHITECTURE.md`: one Hetzner VM per
environment behind Cloudflare, containers deployed by Kamal 2 from GitHub
Actions, Postgres on the box, R2 for uploads and backups.

```
infra/tofu/modules/environment   the reusable environment (VM, firewall, DNS, R2)
infra/tofu/envs/{staging,production}   one instance each; only variables differ
infra/cloud-init/server.yaml.tftpl     first-boot host config (Docker, SSH hardening, ufw, swap)
config/deploy.yml (+ .staging/.production)   Kamal: app, proxy, Postgres accessory
.kamal/secrets, .kamal/hooks/pre-deploy      secret wiring; migrations before traffic
secrets/*.enc.env                             sops+age encrypted per-environment secrets
db/init/01-roles.sh                           Postgres roles on first boot (local + VPS)
Dockerfile, docker-compose.yml                image build; local stack
.github/workflows/{ci,deploy}.yml             build+scan+push image; deploy staging/prod
```

## Bootstrap (one time, in this order)

Everything below is manual by nature: creating accounts and minting the
first credentials. After it, the environment is code.

### 1. Accounts and tokens
| Need | Where | Scope |
|---|---|---|
| `HCLOUD_TOKEN` | Hetzner Cloud console → project → Security → API tokens | Read & Write |
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens | Zone: DNS Edit on your zone; Account: Workers R2 Storage Edit |
| Cloudflare account id + zone id | Cloudflare dashboard, zone overview (right column) | |
| R2 access key + secret | Cloudflare → R2 → Manage R2 API tokens | Object Read & Write (for tofu state + backups + uploads) |
| Dev domain on Cloudflare DNS | Register anywhere, set nameservers to Cloudflare | Staging lives here permanently |

### 2. Keys
```bash
# Deploy SSH key (only way onto the box). Private half -> GitHub secret DEPLOY_SSH_PRIVATE_KEY.
ssh-keygen -t ed25519 -C deploy@spiral-nexus -f ~/.ssh/spiral-nexus-deploy

# age keys: one for you, one for CI. Public halves -> .sops.yaml.
age-keygen -o ~/.config/sops/age/keys.txt          # yours (also in your password manager)
age-keygen -o ./ci-age.txt                          # CI: private half -> GitHub secret SOPS_AGE_KEY, then delete the file
```
Replace the two `REPLACE_WITH_*` recipients in `.sops.yaml`.

### 3. Remote state bucket (chicken-and-egg, so by hand)
Cloudflare → R2 → Create bucket `spiral-nexus-tofu-state` (location WEUR).
Then in each `infra/tofu/envs/<env>/`: copy `backend.hcl.example` → `backend.hcl`
and `terraform.tfvars.example` → `terraform.tfvars`, fill both.

### 4. Apply staging
```bash
cd infra/tofu/envs/staging
export HCLOUD_TOKEN=... CLOUDFLARE_API_TOKEN=...
tofu init -backend-config=backend.hcl
tofu plan  -var-file=terraform.tfvars
tofu apply -var-file=terraform.tfvars      # ~2 min; the VM finishes cloud-init ~3 min later
tofu output                                 # server_ipv4, domain, bucket names
ssh -i ~/.ssh/spiral-nexus-deploy deploy@<server_ipv4> 'cloud-init status --wait && docker --version'
```

### 5. Secrets file
```bash
cp secrets/example.env secrets/staging.env   # fill in; generate passwords with `openssl rand -base64 32`
sops --encrypt --input-type dotenv --output-type dotenv secrets/staging.env > secrets/staging.enc.env
rm secrets/staging.env
git add secrets/staging.enc.env
```

### 6. GitHub configuration
Repository → Settings:
- **Variables** (repo-level): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (transitional, until the Clerk/data-layer PRs), `DEPLOY_ENABLED=true` when ready.
- **Environments**: create `staging` and `production`. On each set variables `KAMAL_WEB_HOST` (server IPv4) and `KAMAL_APP_HOST` (domain). On `production` add yourself as a **required reviewer**.
- **Secrets** (repo-level): `DEPLOY_SSH_PRIVATE_KEY`, `SOPS_AGE_KEY`.
- Add the GitHub Actions egress to `allowed_ssh_cidrs`, or run deploys via `bin/kamal` from your machine until you set up a self-hosted runner / Tailscale. (GitHub's ranges are broad; the second option is tighter.)

### 7. First deploy
```bash
# From your machine (needs docker, sops, age; uses secrets/staging.enc.env):
export KAMAL_WEB_HOST=<ipv4> KAMAL_APP_HOST=staging.<dev-domain>
bin/kamal setup -d staging -P --version $(git rev-parse HEAD)   # first time: boots proxy + Postgres accessory + app
# Afterwards CI does `kamal deploy` on every merge to main.
```

`kamal setup` boots the Postgres accessory first; `db/init/01-roles.sh`
creates the four roles from the secrets on that first start only. Changing a
role password later means `alter role` on the host AND the secrets file.

### 8. Production
Repeat 3–7 with `envs/production` and `secrets/production.enc.env`. Production
deploys only via the `Deploy` workflow's manual dispatch with approval.

## Day 2

| Task | Command |
|---|---|
| Deploy a specific commit | `bin/kamal deploy -d staging -P --version <sha>` |
| Roll back | `bin/kamal rollback <previous sha> -d staging` |
| Logs | `bin/kamal app logs -d staging -f` |
| Shell in the app container | `bin/kamal app exec -i -d staging sh` |
| psql on the box | `bin/kamal accessory exec postgres -i -d staging "psql -U postgres spiral_nexus"` |
| Change infra | edit `.tf`, `tofu plan`, `tofu apply` in the env directory |
| Rebuild a host from scratch | `tofu taint module.environment.hcloud_server.web && tofu apply`, then `bin/kamal setup` (restore DB from backup first: backups PR) |

Still to land after this PR: WAL backups to R2 (wal-g), the migration runner
(`db:migrate`), observability agent, and the Clerk / data-layer / storage /
realtime application changes — each its own PR, see
`docs/TARGET-ARCHITECTURE.md` §8.
