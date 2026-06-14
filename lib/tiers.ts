// Single source of truth for subscription tiers and their capabilities.
// Read capabilities from here everywhere; never hardcode tier names in features.
// Enforce limits SERVER-SIDE (route handlers / DB) - the UI is not the boundary.

export type Tier = "entry" | "professional" | "brand_partner" | "enterprise";

export interface TierCapabilities {
  label: string;
  pricePerMonth: number; // GBP
  maxListings: number | null; // null = unlimited
  weeklyDmLimit: number | null; // null = unlimited
  canSeeSellerAnalytics: boolean;
  canGetVerifiedBadge: boolean;
  fullMatchmaking: boolean;
}

export const TIERS: Record<Tier, TierCapabilities> = {
  entry: {
    label: "Entry",
    pricePerMonth: 0,
    maxListings: 0,
    weeklyDmLimit: 0,
    canSeeSellerAnalytics: false,
    canGetVerifiedBadge: false,
    fullMatchmaking: false,
  },
  professional: {
    label: "Professional",
    pricePerMonth: 99,
    maxListings: 5,
    weeklyDmLimit: 5,
    canSeeSellerAnalytics: true,
    canGetVerifiedBadge: true,
    fullMatchmaking: false,
  },
  brand_partner: {
    label: "Brand Partner",
    pricePerMonth: 99,
    maxListings: 0,
    weeklyDmLimit: 5,
    canSeeSellerAnalytics: false,
    canGetVerifiedBadge: true,
    fullMatchmaking: false,
  },
  enterprise: {
    label: "Enterprise",
    pricePerMonth: 249,
    maxListings: null,
    weeklyDmLimit: null,
    canSeeSellerAnalytics: true,
    canGetVerifiedBadge: true,
    fullMatchmaking: true,
  },
};

export function can(tier: Tier): TierCapabilities {
  return TIERS[tier];
}
