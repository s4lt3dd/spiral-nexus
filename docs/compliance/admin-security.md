# Admin & operational security

> **Draft — pending review.** Operational controls for the people and systems
> that run Spiral Nexus. Most items below are dashboard settings you must enable
> on each provider — they cannot be set from this repo. Items marked
> **[MANUAL]** require an admin to action them on the provider.

## Multi-factor authentication (MFA)

Enforce MFA on every account with access to production systems or source.

- **[MANUAL] Supabase** — enable MFA on the Supabase account/organization and
  require it for all members of the project. (Dashboard → Account → Security; and
  Organization → Settings → Members.)
- **[MANUAL] Vercel** — enable 2FA on the Vercel account and enforce it for the
  team. (Account Settings → Authentication; Team → Settings → Security.)
- **[MANUAL] GitHub** — enable 2FA on every account with access to the
  `s4lt3dd/spiral-nexus` repo and turn on the org/repo "require 2FA" setting.
- **[MANUAL] Google** — if Google sign-in / Workspace is used by admins, enforce
  2-Step Verification there too.

## Access control (least privilege)

- **[MANUAL]** Grant the minimum role needed; remove access promptly when someone
  no longer needs it. Review the access list quarterly.
- **[MANUAL]** Avoid shared logins; each admin uses their own account so actions
  are attributable.

## Secrets & keys

- Secrets live only in environment variables (`.env.local` locally; Vercel
  project env vars in production) — never committed. See `.env.example`.
- The **service-role key** and any future **Stripe secret** are server-only and
  must never reach the browser. The service-role key is used only in server-only
  modules and local seed/maintenance scripts.
- **[MANUAL]** Rotate the Supabase service-role/anon keys and any provider
  secrets if exposure is suspected, and on staff offboarding. Rotate on a
  periodic schedule (e.g. annually) as a baseline.

## Backups & recovery

- **[MANUAL]** Confirm Supabase automated backups/point-in-time recovery are
  enabled for the project and note the retention window.

## Incident response

- **[MANUAL]** Define who is contacted on a suspected breach and the first steps
  (rotate keys, revoke sessions, assess scope using `data-inventory.md`).
- GDPR breach-notification timelines may apply — see the Privacy Policy and
  consult counsel.

## Checklist

- [ ] MFA enforced: Supabase, Vercel, GitHub, Google
- [ ] 2FA-required org settings enabled where available
- [ ] Access list reviewed; least privilege applied
- [ ] Secrets only in env vars; service-role/Stripe keys server-only
- [ ] Key rotation policy documented and owner assigned
- [ ] Supabase backups/PITR confirmed
- [ ] Incident contact + first-response steps documented
