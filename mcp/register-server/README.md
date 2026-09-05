# Spiral Nexus register MCP

Read-only MCP server over the ingested IP-office register data
(`ip_office_records` + `trademark_non_use_radar`). This is the **internal
concierge-matchmaking surface**: staff ask a model things like *"which dormant
class-3 marks are near grace-end, and who might want them?"* and broker the
introduction manually.

Full setup, security model, and activation steps: **`docs/INGESTION.md`**
(section "Enable the register MCP"). Short version:

```bash
cd mcp/register-server
npm install
```

1. Enable login for the `register_reader` role and set a password
   (Supabase dashboard → SQL editor; the migration creates the role NOLOGIN).
2. Put the connection string in the repo's gitignored `.env.local` as
   `REGISTER_READONLY_DATABASE_URL` (the server reads it from there when the
   environment variable is unset, so the credential lives in one place). The
   env var still wins when set, e.g. in CI.
3. Register the server with Claude — no secret in the MCP config:

```bash
claude mcp add spiral-nexus-register -- node C:/Projects/spiral-nexus/mcp/register-server/index.mjs
```

4. Prove the role's scope (reads register objects, nothing else, no writes),
   then exercise all four tools through a real stdio MCP client against the
   ingested fixture:

```bash
npm run verify
npm run smoke
```

Both exit non-zero on any failure. `smoke` needs the fixture ingested first
(`node supabase/seed/seed-office-records.mjs` from the repo root).

Connection notes: the direct `db.<project-ref>.supabase.co` host is often
IPv6-only; from an IPv4-only machine use the session pooler
(`register_reader.<project-ref>@aws-0-<region>.pooler.supabase.com:5432`).
TLS is handled in `db.mjs` (a `?sslmode=` suffix is accepted and stripped),
and every query runs in an explicit READ ONLY transaction.

## Tools

| Tool | What it answers |
|---|---|
| `describe_data` | What's in the dataset right now (counts, buckets, column meanings) |
| `search_register` | Text/class/status/country search over register records |
| `non_use_radar` | Ranked outreach candidates by grace-period urgency |
| `find_similar_marks` | "Is there already a mark like X?" (trigram similarity) |

## Guardrails

- Connects as `register_reader`, whose **only** grants are SELECT on the two
  register objects — user, listing, and message data are structurally out of
  reach. Every query additionally runs in a READ ONLY transaction.
- **Single-operator setup.** A shared static password on a laptop is
  acceptable while one person runs concierge matching. Before a second staff
  member gets access, host this MCP behind per-user authentication (the
  Streamable HTTP transport + Supabase Auth/OAuth) so the database credential
  leaves laptops and every query carries an identity.
- Register data is **intelligence, not supply**: radar rows are exposure
  candidates, never proof of non-use, and presence on the register never
  implies the owner wants to deal.
