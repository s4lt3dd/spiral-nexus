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
2. Register the server with Claude:

```bash
claude mcp add spiral-nexus-register --env REGISTER_READONLY_DATABASE_URL="postgresql://register_reader:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require" -- node C:/Projects/spiral-nexus/mcp/register-server/index.mjs
```

3. Prove the role's scope (reads register objects, nothing else, no writes):

```bash
REGISTER_READONLY_DATABASE_URL="postgresql://register_reader:...@..." npm run verify
```

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
  reach. Sessions are additionally forced read-only.
- Register data is **intelligence, not supply**: radar rows are exposure
  candidates, never proof of non-use, and presence on the register never
  implies the owner wants to deal.
