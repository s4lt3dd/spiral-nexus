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
  jurisdiction: string | null;
  registration_number: string | null;
  status: string | null;
  deal_type: DealType;
  asking_price: number | null;
  source: AssetSource;
  nice_class: number | null;
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
  stripe_customer_id: string | null;
  created_at: string;
}
