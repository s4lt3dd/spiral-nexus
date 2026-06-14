// Zod boundary for trademark listings. The server actions re-validate every
// payload with this schema - the client form is UX, never the security line.

import { z } from "zod";
import { TRADEMARK_STATUSES, DEAL_TYPES } from "@/lib/listings";

const statusValues = TRADEMARK_STATUSES.map((s) => s.value) as [
  string,
  ...string[],
];
const dealValues = DEAL_TYPES.map((d) => d.value) as [string, ...string[]];

// Treat "" (empty form fields) as "not provided".
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const listingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: optionalText(4000),
  jurisdiction: optionalText(80),
  registration_number: optionalText(60),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(statusValues).optional(),
  ),
  nice_class: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1, "Nice class is 1–45").max(45).optional(),
  ),
  deal_type: z.enum(dealValues),
  asking_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().nonnegative("Price cannot be negative").optional(),
  ),
  mark_image_url: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url("Enter a valid URL")
      .max(2000)
      // Only http(s) - blocks javascript:/data: URLs that could bite when the
      // image is rendered in a later slice.
      .refine(
        (u) => /^https?:\/\//i.test(u),
        "Image URL must start with http:// or https://",
      )
      .optional(),
  ),
  is_published: z.boolean().default(false),
});

export type ListingInput = z.input<typeof listingSchema>;
export type ListingValues = z.output<typeof listingSchema>;
