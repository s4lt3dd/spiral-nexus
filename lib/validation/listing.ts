// Zod boundary for trademark listings. The server actions re-validate every
// payload with this schema - the client form is UX, never the security line.

import { z } from "zod";
import { TRADEMARK_STATUSES, DEAL_TYPES, CURRENCIES } from "@/lib/listings";

const statusValues = TRADEMARK_STATUSES.map((s) => s.value) as [
  string,
  ...string[],
];
const dealValues = DEAL_TYPES.map((d) => d.value) as [string, ...string[]];
const currencyValues = CURRENCIES.map((c) => c.value) as [string, ...string[]];

// Treat "" (empty form fields) as "not provided".
const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// Only http(s) - blocks javascript:/data: URLs that could bite when rendered.
const httpsUrl = (message: string) =>
  z
    .string()
    .url(message)
    .max(2000)
    .refine(
      (u) => /^https?:\/\//i.test(u),
      "URL must start with http:// or https://",
    );

export const listingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: optionalText(4000),
  // Registration office — DB column is still `jurisdiction`.
  jurisdiction: optionalText(80),
  registration_number: optionalText(60),
  status: z.preprocess(
    emptyToUndefined,
    z.enum(statusValues).optional(),
  ),
  // Multiple Nice classes (founder ask). Deduped; each 1–45.
  nice_classes: z
    .array(z.number().int().min(1, "Nice class is 1–45").max(45))
    .max(45)
    .transform((arr) => [...new Set(arr)].sort((a, b) => a - b))
    .default([]),
  deal_type: z.enum(dealValues),
  asking_price: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().nonnegative("Price cannot be negative").optional(),
  ),
  currency: z.enum(currencyValues).default("GBP"),
  // Link to the mark's record at the registration office.
  office_url: z.preprocess(
    emptyToUndefined,
    httpsUrl("Enter a valid URL").optional(),
  ),
  // Countries where the trademark rights apply.
  territory: z
    .array(z.string().trim().min(1).max(80))
    .max(60)
    .default([]),
  filing_date: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
      .refine((d) => {
        const t = new Date(`${d}T00:00:00Z`).getTime();
        return (
          !Number.isNaN(t) &&
          t >= Date.UTC(1875, 0, 1) &&
          t <= Date.now()
        );
      }, "Filing date must be in the past")
      .optional(),
  ),
  // License terms (shown when the deal includes a license).
  license_duration: optionalText(200),
  // Tri-state: true / false / unspecified.
  license_renewable: z
    .preprocess(
      (v) => (v === "" || v === undefined ? null : v),
      z.union([z.boolean(), z.null()]),
    )
    .default(null),
  encumbrances: optionalText(4000),
  quality_control: optionalText(4000),
  // Storage object path in the private listing-docs bucket. Ownership of the
  // path prefix is enforced in the server action (must be `<user id>/…`).
  certificate_path: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(500)
      .regex(
        /^[0-9a-f-]{36}\/[\w.-]+$/i,
        "Invalid certificate reference",
      )
      .optional(),
  ),
  // Uploaded listing images (public bucket URLs).
  images: z.array(httpsUrl("Invalid image URL")).max(6).default([]),
  mark_image_url: z.preprocess(
    emptyToUndefined,
    httpsUrl("Enter a valid URL").optional(),
  ),
  is_published: z.boolean().default(false),
});

export type ListingInput = z.input<typeof listingSchema>;
export type ListingValues = z.output<typeof listingSchema>;
