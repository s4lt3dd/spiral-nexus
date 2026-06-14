// Messaging policy. Two separate limits:
//  - weeklyDmLimit: the Slice-4 *monetization* cap (open while payments are off).
//  - DAILY_NEW_CONVERSATION_CAP: anti-spam hygiene, always on, well above honest
//    use — caps how many NEW threads one account can start per day.

import { can, type Tier } from "@/lib/tiers";
import { paymentsEnabled } from "@/lib/listings";

export const DAILY_NEW_CONVERSATION_CAP = 30;

// null = unlimited. While payments are off, messaging is free/open; Slice 4
// flips PAYMENTS_ENABLED and this starts enforcing the per-tier weekly cap.
export function weeklyDmLimit(tier: Tier): number | null {
  if (!paymentsEnabled()) return null;
  return can(tier).weeklyDmLimit;
}
