// Profile reference data + the single source of truth for "completeness".
// Home, the onboarding flow, the nudge, and the directory (Slice 5) all read
// from here so they agree on one definition.

import type { Profile } from "@/lib/types";

// Explicit public column list — mirrors the column-level GRANT in
// 20260621120000_profiles_extend.sql (stripe_customer_id excluded). Use this
// for every profile read so a private column is never selected by accident.
export const PUBLIC_PROFILE_COLUMNS =
  "id, display_name, org_name, role_flags, subscription_tier, verified, headline, bio, avatar_url, website, linkedin_url, location, sectors, nice_class_interests, jurisdictions, onboarded_at, created_at";

// ---------- Intent / roles ----------
// owner | buyer | licensee | investor (founder decision — investors included).
export type ProfileRole = "owner" | "buyer" | "licensee" | "investor";

export const PROFILE_ROLES: {
  value: ProfileRole;
  label: string;
  blurb: string;
}[] = [
  { value: "owner", label: "IP owner", blurb: "I own trademarks to license or sell" },
  { value: "buyer", label: "Buyer", blurb: "I'm looking to acquire IP assets" },
  { value: "licensee", label: "Licensee", blurb: "I want to license brands to use" },
  { value: "investor", label: "Investor", blurb: "I invest in IP and brands" },
];

const ROLE_LABELS = new Map(PROFILE_ROLES.map((r) => [r.value, r.label]));
export const ROLE_VALUES = PROFILE_ROLES.map((r) => r.value);

export function roleLabel(value: string): string {
  return ROLE_LABELS.get(value as ProfileRole) ?? value;
}

// ---------- Sectors (controlled vocab — feeds the directory filter) ----------
export const SECTORS = [
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Food & Beverage",
  "Technology & Software",
  "Health & Wellness",
  "Financial Services",
  "Media & Entertainment",
  "Consumer Goods",
  "Hospitality & Travel",
  "Automotive",
  "Industrial & Manufacturing",
  "Professional Services",
] as const;

// ---------- Jurisdictions of interest ----------
export const JURISDICTIONS = [
  "United Kingdom",
  "European Union",
  "United States",
  "WIPO (International)",
  "China",
  "Canada",
] as const;

// ---------- Nice classification (1–45) ----------
// Short titles for chips and the interest picker. Goods 1–34, services 35–45.
export const NICE_CLASSES: { value: number; label: string }[] = [
  { value: 1, label: "Chemicals" },
  { value: 2, label: "Paints" },
  { value: 3, label: "Cosmetics & cleaning" },
  { value: 4, label: "Lubricants & fuels" },
  { value: 5, label: "Pharmaceuticals" },
  { value: 6, label: "Common metals" },
  { value: 7, label: "Machines" },
  { value: 8, label: "Hand tools" },
  { value: 9, label: "Electronics & software" },
  { value: 10, label: "Medical apparatus" },
  { value: 11, label: "Heating & lighting" },
  { value: 12, label: "Vehicles" },
  { value: 13, label: "Firearms" },
  { value: 14, label: "Jewellery & watches" },
  { value: 15, label: "Musical instruments" },
  { value: 16, label: "Paper & printed matter" },
  { value: 17, label: "Rubber & plastics" },
  { value: 18, label: "Leather goods" },
  { value: 19, label: "Building materials" },
  { value: 20, label: "Furniture" },
  { value: 21, label: "Household utensils" },
  { value: 22, label: "Ropes & raw textiles" },
  { value: 23, label: "Yarns & threads" },
  { value: 24, label: "Textiles & fabrics" },
  { value: 25, label: "Clothing & footwear" },
  { value: 26, label: "Lace & embroidery" },
  { value: 27, label: "Carpets & rugs" },
  { value: 28, label: "Games & toys" },
  { value: 29, label: "Meat & processed foods" },
  { value: 30, label: "Coffee, tea & staples" },
  { value: 31, label: "Agriculture & fresh produce" },
  { value: 32, label: "Beers & soft drinks" },
  { value: 33, label: "Alcoholic beverages" },
  { value: 34, label: "Tobacco & smokers' articles" },
  { value: 35, label: "Advertising & business" },
  { value: 36, label: "Insurance & finance" },
  { value: 37, label: "Construction & repair" },
  { value: 38, label: "Telecommunications" },
  { value: 39, label: "Transport & storage" },
  { value: 40, label: "Material treatment" },
  { value: 41, label: "Education & entertainment" },
  { value: 42, label: "Science & technology (IT)" },
  { value: 43, label: "Food & drink services" },
  { value: 44, label: "Medical & beauty services" },
  { value: 45, label: "Legal & security services" },
];

const NICE_LABELS = new Map(NICE_CLASSES.map((c) => [c.value, c.label]));

export function niceClassLabel(n: number): string {
  return NICE_LABELS.get(n) ?? `Class ${n}`;
}

// ---------- Display helpers ----------
type ProfileLike = Pick<
  Profile,
  | "display_name"
  | "org_name"
  | "headline"
  | "bio"
  | "avatar_url"
  | "location"
  | "role_flags"
  | "sectors"
  | "jurisdictions"
>;

// Best human name for a profile, with a graceful fallback.
export function profileDisplayName(p: {
  display_name: string | null;
  org_name: string | null;
}): string {
  return p.display_name?.trim() || p.org_name?.trim() || "Spiral Nexus member";
}

// Up-to-two-letter monogram for the gradient avatar fallback.
export function profileInitials(p: {
  display_name: string | null;
  org_name: string | null;
}): string {
  const name = profileDisplayName(p);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ---------- Completeness (derived, never stored) ----------
export interface CompletenessResult {
  percent: number; // 0–100
  completed: number;
  total: number;
  missing: { key: string; label: string }[];
}

const has = (v: string | null | undefined) => !!v && v.trim().length > 0;
const hasAny = (v: unknown[] | null | undefined) => (v?.length ?? 0) > 0;

export function profileCompleteness(p: ProfileLike): CompletenessResult {
  const checks = [
    { key: "display_name", label: "Add your name", done: has(p.display_name) },
    { key: "headline", label: "Write a headline", done: has(p.headline) },
    { key: "bio", label: "Add a short bio", done: has(p.bio) },
    { key: "avatar_url", label: "Add a profile photo", done: has(p.avatar_url) },
    { key: "location", label: "Set your location", done: has(p.location) },
    { key: "role_flags", label: "Tell us what brings you here", done: hasAny(p.role_flags) },
    { key: "sectors", label: "Pick sectors you focus on", done: hasAny(p.sectors) },
    { key: "jurisdictions", label: "Choose jurisdictions of interest", done: hasAny(p.jurisdictions) },
  ];
  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;
  return {
    percent: Math.round((completed / total) * 100),
    completed,
    total,
    missing: checks.filter((c) => !c.done).map(({ key, label }) => ({ key, label })),
  };
}
