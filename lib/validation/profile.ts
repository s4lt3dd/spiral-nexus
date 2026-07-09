// Zod boundary for profile edits + onboarding. The server actions re-validate
// every payload with this schema. Critically, this schema is the WHITELIST of
// user-editable columns: it deliberately omits `verified`, `subscription_tier`,
// and `stripe_customer_id` so a user can never self-verify or self-upgrade.

import { z } from "zod";
import { ROLE_VALUES, SECTORS, JURISDICTIONS, COUNTRIES } from "@/lib/profile";

const roleValues = ROLE_VALUES as [string, ...string[]];
const sectorValues = SECTORS as unknown as [string, ...string[]];
const jurisdictionValues = JURISDICTIONS as unknown as [string, ...string[]];
const countryValues = COUNTRIES as unknown as [string, ...string[]];

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// http(s)-only URL (blocks javascript:/data: URLs that could bite when rendered).
const httpUrl = (label: string) =>
  z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url("Enter a valid URL")
      .max(2000)
      .refine(
        (u) => /^https?:\/\//i.test(u),
        `${label} must start with http:// or https://`,
      )
      .optional(),
  );

export const profileSchema = z.object({
  display_name: optionalText(80),
  org_name: optionalText(120),
  headline: optionalText(140),
  bio: optionalText(1000),
  location: optionalText(120),
  country: z.preprocess(emptyToUndefined, z.enum(countryValues).optional()),
  avatar_url: httpUrl("Avatar URL"),
  website: httpUrl("Website"),
  linkedin_url: httpUrl("LinkedIn URL"),
  role_flags: z.array(z.enum(roleValues)).max(4).default([]),
  sectors: z.array(z.enum(sectorValues)).max(sectorValues.length).default([]),
  jurisdictions: z
    .array(z.enum(jurisdictionValues))
    .max(jurisdictionValues.length)
    .default([]),
  nice_class_interests: z
    .array(z.coerce.number().int().min(1).max(45))
    .max(45)
    .default([]),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;
