# Subprocessors

> **Draft — pending legal review.** Keep this list current; it backs the Privacy
> Policy and any data-processing agreements. Confirm regions and DPA links with
> each provider before launch.

Spiral Nexus uses the following third-party processors to operate the service.
Each processes personal data only on our instructions and under a data
processing agreement (DPA).

| Subprocessor | Purpose | Data processed | Region / safeguard |
|---|---|---|---|
| **Supabase** | Postgres database, authentication, file storage | Account, profile, listings, messages, saved/follows, auth metadata | Confirm project region (EU recommended); DPA + SCCs/UK Addendum |
| **Vercel** | Application hosting, edge/CDN, logs | Request metadata, IP, session cookies | DPA + SCCs/UK Addendum |
| **Google (Sign-In)** | Optional OAuth sign-in | Email, basic profile from the user's Google account | Used only if the user chooses Google sign-in |
| **[Transactional email provider]** | Magic-link / sign-in emails | Email address, delivery metadata | Confirm provider + region; DPA required |

## Notes
- No advertising or analytics processors are used in the pre-launch phase.
- Stripe is **not** integrated yet (payments are deferred to launch); add it here
  when subscriptions ship.
- Review this list whenever a new dependency that touches personal data is added
  (see `CLAUDE.md` — ask before adding dependencies).
