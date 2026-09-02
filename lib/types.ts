// Domain types. Once a Supabase project exists, generate full DB types with:
//   npx supabase gen types typescript --project-id <id> > lib/database.types.ts
// and import the Database type here.

export type IpType = "trademark" | "patent";
export type DealType = "license" | "sale" | "both";
export type AssetSource = "user_submitted" | "ip_office";

export interface IpAsset {
  id: string;
  owner_id: string;
  type: IpType;
  title: string;
  description: string | null;
  // Registration office (kept as `jurisdiction` in the DB; the UI says
  // "Registration Office" per founder feedback).
  jurisdiction: string | null;
  registration_number: string | null;
  status: string | null;
  deal_type: DealType;
  asking_price: number | null;
  currency: string;
  source: AssetSource;
  // Slice B — full trademark data set.
  nice_classes: number[];
  office_url: string | null;
  territory: string[];
  filing_date: string | null;
  license_duration: string | null;
  license_renewable: boolean | null;
  encumbrances: string | null;
  quality_control: string | null;
  certificate_path: string | null;
  mark_image_url: string | null;
  ipc_class: string | null;
  abstract: string | null;
  images: string[] | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  org_name: string | null;
  role_flags: string[];
  subscription_tier: string;
  verified: boolean;
  // Slice 4 — public-facing identity + interests.
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  linkedin_url: string | null;
  location: string | null;
  // Where the member is based (curated COUNTRIES vocab; Connect filters on it).
  country: string | null;
  sectors: string[];
  nice_class_interests: number[];
  jurisdictions: string[];
  onboarded_at: string | null;
  // Billing — never exposed to the browser via the public column grant.
  stripe_customer_id: string | null;
  created_at: string;
}

// The columns a non-owner may read (mirrors the column-level GRANT in
// 20260621120000_profiles_extend.sql — stripe_customer_id is intentionally
// excluded). Use this for public-profile reads so we never select a private
// column by accident.
export type PublicProfile = Omit<Profile, "stripe_customer_id">;

export interface SavedListing {
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface ListingLike {
  user_id: string;
  listing_id: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  owner_id: string;
  created_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface ConversationRead {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

// ---------- IP-office ingestion (register data — intelligence, not supply) ----------
// Official register records live in ip_office_records, strictly separate from
// user-submitted ip_assets, and are never rendered as listings. The app's
// anon/authenticated roles cannot read them at all; access is service-role
// (ingestion) or the read-only register_reader role (internal matching MCP).
// See docs/INGESTION.md.

export type Registry = "euipo" | "ukipo" | "uspto" | "wipo";

export type OfficeRecordStatus =
  | "registered"
  | "pending"
  | "expired"
  | "opposed"
  | "withdrawn"
  | "other";

export interface OfficeRecord {
  id: string;
  registry: Registry;
  // The registry's own identifier (e.g. EUTM application number).
  office_ref: string;
  mark_text: string | null;
  mark_kind: string | null;
  mark_image_url: string | null;
  nice_classes: number[];
  status: OfficeRecordStatus;
  status_raw: string | null;
  filing_date: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  // Art. 18 EUTMR: registration_date + 5 years (generated in the database).
  grace_period_ends: string | null;
  owner_name: string | null;
  owner_country: string | null;
  territory: string[];
  office_url: string | null;
  source_updated_at: string | null;
  ingested_at: string;
}

// vulnerable = grace period already ended; approaching = ends within 180
// days; watch = registered with >180 days of room.
export type RadarBucket = "vulnerable" | "approaching" | "watch";

// A row of the trademark_non_use_radar view (registered marks only).
export interface RadarRow {
  id: string;
  registry: Registry;
  office_ref: string;
  mark_text: string | null;
  mark_kind: string | null;
  nice_classes: number[];
  filing_date: string | null;
  registration_date: string | null;
  expiry_date: string | null;
  grace_period_ends: string;
  days_to_grace_end: number;
  radar_bucket: RadarBucket;
  owner_name: string | null;
  owner_country: string | null;
  office_url: string | null;
}
