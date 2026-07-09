// Discovery (Slice 2): Nice-class catalog, search-param validation, and the
// listings query (filters + name-centric FTS + trigram fuzzy + pagination).

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IpAsset } from "@/lib/types";
import { DEAL_TYPES } from "@/lib/listings";

export const PAGE_SIZE = 12;

// Nice classification (1–45) with short labels for the searchable picker.
export const NICE_CLASSES: { value: number; label: string }[] = [
  { value: 1, label: "Chemicals" },
  { value: 2, label: "Paints" },
  { value: 3, label: "Cosmetics & cleaning" },
  { value: 4, label: "Lubricants & fuels" },
  { value: 5, label: "Pharmaceuticals" },
  { value: 6, label: "Common metals & goods" },
  { value: 7, label: "Machinery" },
  { value: 8, label: "Hand tools" },
  { value: 9, label: "Electronics & software" },
  { value: 10, label: "Medical apparatus" },
  { value: 11, label: "Appliances (lighting/heating)" },
  { value: 12, label: "Vehicles" },
  { value: 13, label: "Firearms" },
  { value: 14, label: "Jewellery & watches" },
  { value: 15, label: "Musical instruments" },
  { value: 16, label: "Paper & printed matter" },
  { value: 17, label: "Rubber & plastics" },
  { value: 18, label: "Leather goods" },
  { value: 19, label: "Building materials (non-metal)" },
  { value: 20, label: "Furniture" },
  { value: 21, label: "Household utensils" },
  { value: 22, label: "Ropes & raw textiles" },
  { value: 23, label: "Yarns & threads" },
  { value: 24, label: "Fabrics & textiles" },
  { value: 25, label: "Clothing & footwear" },
  { value: 26, label: "Lace & embroidery" },
  { value: 27, label: "Carpets & rugs" },
  { value: 28, label: "Games & sporting goods" },
  { value: 29, label: "Meat, dairy & preserved foods" },
  { value: 30, label: "Coffee, tea & bakery" },
  { value: 31, label: "Agriculture & live animals" },
  { value: 32, label: "Beers & soft drinks" },
  { value: 33, label: "Alcoholic beverages" },
  { value: 34, label: "Tobacco & smokers' articles" },
  { value: 35, label: "Advertising & business" },
  { value: 36, label: "Insurance & finance" },
  { value: 37, label: "Construction & repair" },
  { value: 38, label: "Telecommunications" },
  { value: 39, label: "Transport & logistics" },
  { value: 40, label: "Material treatment" },
  { value: 41, label: "Education & entertainment" },
  { value: 42, label: "Science & IT services" },
  { value: 43, label: "Food & drink services" },
  { value: 44, label: "Medical & beauty services" },
  { value: 45, label: "Legal & security services" },
];

export function niceClassLabel(n: number | null | undefined): string | null {
  if (n == null) return null;
  const hit = NICE_CLASSES.find((c) => c.value === n);
  return hit ? `${n} — ${hit.label}` : `${n}`;
}

// Multi-class variant for the expanded listings (nice_classes int[]).
export function niceClassesLabel(ns: number[] | null | undefined): string | null {
  if (!ns?.length) return null;
  return ns.map((n) => niceClassLabel(n)).join(" · ");
}

// Curated jurisdiction options (kept small for the MVP filter).
export const JURISDICTIONS = [
  "United Kingdom",
  "United States",
  "European Union",
  "WIPO (International)",
] as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

const dealValues = DEAL_TYPES.map((d) => d.value) as [string, ...string[]];
const sortValues = SORT_OPTIONS.map((s) => s.value) as [string, ...string[]];

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

// Boundary schema for the URL search params (never trust them raw).
export const discoveryParamsSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  nice_class: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(1).max(45).optional(),
  ),
  jurisdiction: z.preprocess(emptyToUndefined, z.string().max(80).optional()),
  deal_type: z.preprocess(emptyToUndefined, z.enum(dealValues).optional()),
  sort: z.preprocess(emptyToUndefined, z.enum(sortValues).catch("newest").default("newest")),
  page: z.preprocess(
    (v) => (v == null || v === "" ? 1 : Number(v)),
    z.number().int().min(1).catch(1).default(1),
  ),
});

export type DiscoveryParams = z.infer<typeof discoveryParamsSchema>;

// Build a tsquery with prefix matching: "nim cloud" -> "nim:*&cloud:*".
function toPrefixTsquery(q: string): string {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .map((t) => `${t}:*`)
    .join("&");
}

export type ListingsResult = {
  rows: IpAsset[];
  count: number;
  pageCount: number;
};

// Query published listings with filters, name-centric search, and pagination.
// Keyword search needs migration 20260614204057 (search column + pg_trgm).
// `excludeOwnerId` hides the viewer's own listings (they manage those on the
// dashboard, not via public browse).
export async function searchListings(
  supabase: SupabaseClient,
  params: DiscoveryParams,
  excludeOwnerId?: string | null,
): Promise<ListingsResult> {
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("ip_assets")
    .select(
      "id,owner_id,type,title,description,jurisdiction,registration_number,status,deal_type,asking_price,currency,source,nice_classes,office_url,territory,filing_date,license_duration,license_renewable,encumbrances,quality_control,certificate_path,mark_image_url,ipc_class,abstract,images,is_published,created_at,updated_at",
      { count: "exact" },
    )
    .eq("is_published", true);

  if (excludeOwnerId) query = query.neq("owner_id", excludeOwnerId);

  // Single-class filter over the multi-class column (array containment).
  if (params.nice_class)
    query = query.contains("nice_classes", [params.nice_class]);
  if (params.jurisdiction) query = query.eq("jurisdiction", params.jurisdiction);
  if (params.deal_type) query = query.eq("deal_type", params.deal_type);

  if (params.q) {
    const ts = toPrefixTsquery(params.q);
    const like = `*${params.q.replace(/[%,()*:&]/g, " ").trim()}*`;
    // FTS prefix on title+description OR trigram-fuzzy substring on title.
    const ors: string[] = [];
    if (ts) ors.push(`search.fts(english).${ts}`);
    ors.push(`title.ilike.${like}`);
    query = query.or(ors.join(","));
  }

  if (params.sort === "price_asc") {
    query = query.order("asking_price", { ascending: true, nullsFirst: false });
  } else if (params.sort === "price_desc") {
    query = query.order("asking_price", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, count, error } = await query.range(from, to);
  if (error) throw error;

  const total = count ?? 0;
  return {
    rows: (data ?? []) as IpAsset[],
    count: total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
