// Listing domain constants + the MVP listing-cap policy.
//
// While payments are off (PAYMENTS_ENABLED !== "true") every signed-in user
// gets a bounded MVP allowance so the free tier is usable without Stripe.
// Once payments ship, the allowance comes from the canonical per-tier numbers
// in lib/tiers.ts - which we deliberately do NOT mutate here.

import { can, type Tier } from "@/lib/tiers";

// Trademark status vocabulary (NOT patent "granted"). Opposed is included.
export const TRADEMARK_STATUSES = [
  { value: "registered", label: "Registered" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "opposed", label: "Opposed" },
] as const;

export type TrademarkStatus = (typeof TRADEMARK_STATUSES)[number]["value"];

export const DEAL_TYPES = [
  { value: "license", label: "License" },
  { value: "sale", label: "Sale" },
  { value: "both", label: "License or sale" },
] as const;

export function statusLabel(value: string | null): string | null {
  return TRADEMARK_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function dealTypeLabel(value: string): string {
  return DEAL_TYPES.find((d) => d.value === value)?.label ?? value;
}

// Status -> badge variant (see MASTER.md status-pill mapping).
export type StatusVariant = "brand" | "warning" | "slate" | "destructive";
export function statusPillVariant(value: string | null): StatusVariant {
  switch (value) {
    case "registered":
      return "brand";
    case "pending":
      return "warning";
    case "opposed":
      return "destructive";
    case "expired":
    default:
      return "slate";
  }
}

// Bounded allowance granted to every signed-in user while payments are off.
export const MVP_LISTING_ALLOWANCE = 10;

export function paymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "true";
}

// How many listings this user may hold. null = unlimited.
export function listingAllowance(tier: Tier): number | null {
  if (!paymentsEnabled()) return MVP_LISTING_ALLOWANCE;
  return can(tier).maxListings;
}
