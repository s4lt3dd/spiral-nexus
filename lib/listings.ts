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

// Currencies an owner can price in (founder ask: "option to change currency").
// ISO-4217 codes; kept small and business-relevant for the MVP.
export const CURRENCIES = [
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "CHF", label: "CHF — Swiss Franc" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "CNY", label: "CNY — Chinese Yuan" },
] as const;

export const DEFAULT_CURRENCY = "GBP";

// Price display for cards/detail. Falls back to a bare code prefix if Intl
// doesn't know the currency (can't happen with the curated list above, but
// the column is only CHECK-constrained to /^[A-Z]{3}$/).
export function formatPrice(amount: number, currency: string | null): string {
  const code = currency || DEFAULT_CURRENCY;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("en-GB")}`;
  }
}

// Renewal wording for the detail page ("Open to renewal" tri-state).
export function renewalLabel(v: boolean | null): string | null {
  if (v === null) return null;
  return v ? "Open to renewal" : "Not open to renewal";
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
