// Connect / member directory (Slice 5): search-param validation + the members
// query (text search + array filters + pagination). Read-only over the frozen
// profile schema — mirrors lib/discovery.ts. Filter vocab comes from lib/profile
// so it matches what onboarding/profile edits actually store.

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicProfile } from "@/lib/types";
import {
  PUBLIC_PROFILE_COLUMNS,
  ROLE_VALUES,
  SECTORS,
  JURISDICTIONS,
} from "@/lib/profile";

export const MEMBER_PAGE_SIZE = 12;

export const MEMBER_SORT_OPTIONS = [
  { value: "newest", label: "Newest members" },
  { value: "name", label: "Name (A–Z)" },
] as const;

const roleValues = ROLE_VALUES as [string, ...string[]];
const sectorValues = SECTORS as unknown as [string, ...string[]];
const jurisdictionValues = JURISDICTIONS as unknown as [string, ...string[]];
const sortValues = MEMBER_SORT_OPTIONS.map((s) => s.value) as [
  string,
  ...string[],
];

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Boundary schema for the URL search params (never trust them raw). Unknown
// enum values are dropped so a hand-edited URL can't break the query.
export const memberParamsSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  role: z.preprocess(emptyToUndefined, z.enum(roleValues).optional().catch(undefined)),
  sector: z.preprocess(emptyToUndefined, z.enum(sectorValues).optional().catch(undefined)),
  jurisdiction: z.preprocess(
    emptyToUndefined,
    z.enum(jurisdictionValues).optional().catch(undefined),
  ),
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(sortValues).catch("newest").default("newest"),
  ),
  page: z.preprocess(
    (v) => (v == null || v === "" ? 1 : Number(v)),
    z.number().int().min(1).catch(1).default(1),
  ),
});

export type MemberParams = z.infer<typeof memberParamsSchema>;

export type MembersResult = {
  rows: PublicProfile[];
  count: number;
  pageCount: number;
};

// Query onboarded members with text search, array filters, and pagination.
// `excludeId` hides the viewer from their own directory results.
export async function searchMembers(
  supabase: SupabaseClient,
  params: MemberParams,
  opts?: { excludeId?: string | null },
): Promise<MembersResult> {
  const from = (params.page - 1) * MEMBER_PAGE_SIZE;
  const to = from + MEMBER_PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS, { count: "exact" })
    // Only real, onboarded members — keeps ghost/auto-created rows out.
    .not("onboarded_at", "is", null);

  if (opts?.excludeId) query = query.neq("id", opts.excludeId);

  // Array-column membership filters (Postgres `@>` contains).
  if (params.role) query = query.contains("role_flags", [params.role]);
  if (params.sector) query = query.contains("sectors", [params.sector]);
  if (params.jurisdiction)
    query = query.contains("jurisdictions", [params.jurisdiction]);

  if (params.q) {
    // Substring (ilike) across the name-ish fields. Strip PostgREST/`or`
    // metacharacters so the filter string can't be broken out of.
    const like = `*${params.q.replace(/[%,()*:&]/g, " ").trim()}*`;
    query = query.or(
      `display_name.ilike.${like},headline.ilike.${like},org_name.ilike.${like}`,
    );
  }

  if (params.sort === "name") {
    query = query.order("display_name", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as PublicProfile[],
    count: total,
    pageCount: Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE)),
  };
}
