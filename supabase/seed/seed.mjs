// Seed demo trademark listings for Spiral Nexus.
//
// Listings depend on real auth users (RLS ties ip_assets.owner_id -> profiles
// -> auth.users), so this creates two test owners, then attaches a spread of
// published/draft trademarks across them. Idempotent: safe to re-run.
//
// Usage:  node supabase/seed/seed.mjs
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
// The service-role key is used here ONLY in this local script - never shipped.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const TEST_PASSWORD = "SpiralNexus!Test123";
export const OWNERS = [
  { email: "owner-a@spiralnexus.test", display_name: "Ava Owner", org_name: "Northwind Brands", verified: true },
  { email: "owner-b@spiralnexus.test", display_name: "Ben Owner", org_name: "Lumen Studio", verified: false },
  { email: "owner-c@spiralnexus.test", display_name: "Cara Owner", org_name: "Castellan IP", verified: true },
];

// owner index -> trademark listings (Slice 2: enough variety for browse,
// search, filters, and pagination — 18 listings, mostly published).
const LISTINGS = [
  // Owner A
  { o: 0, title: "NIMBUS", description: "Cloud storage and sync brand with a registered word mark.", jurisdiction: "United Kingdom", registration_number: "UK00003456701", status: "registered", nice_class: 9, deal_type: "license", asking_price: 24000, is_published: true },
  { o: 0, title: "VERDANT", description: "Organic skincare line, full word + figurative mark.", jurisdiction: "United Kingdom", registration_number: "UK00003456702", status: "registered", nice_class: 3, deal_type: "both", asking_price: 38000, is_published: true },
  { o: 0, title: "IRONCLAD", description: "Cybersecurity services mark, application pending.", jurisdiction: "United States", registration_number: "US-90123456", status: "pending", nice_class: 45, deal_type: "sale", asking_price: 52000, is_published: true },
  { o: 0, title: "AETHER", description: "Sparkling beverage brand - draft, not yet listed.", jurisdiction: "European Union", registration_number: "EU018456789", status: "registered", nice_class: 32, deal_type: "license", asking_price: null, is_published: false },
  { o: 0, title: "NIMBUSWEAR", description: "Athleisure clothing label, prefix-shares the Nimbus family name.", jurisdiction: "United Kingdom", registration_number: "UK00003456710", status: "registered", nice_class: 25, deal_type: "both", asking_price: 30000, is_published: true },
  { o: 0, title: "SOLSTICE", description: "Premium coffee roaster word + device mark.", jurisdiction: "European Union", registration_number: "EU018456790", status: "registered", nice_class: 30, deal_type: "license", asking_price: 14000, is_published: true },
  // Owner B
  { o: 1, title: "LUMEN & CO", description: "Premium lighting design house word mark.", jurisdiction: "United Kingdom", registration_number: "UK00003456703", status: "registered", nice_class: 11, deal_type: "license", asking_price: 16000, is_published: true },
  { o: 1, title: "HEARTHSTONE", description: "Homeware brand, registration lapsed and available.", jurisdiction: "United Kingdom", registration_number: "UK00003456704", status: "expired", nice_class: 20, deal_type: "sale", asking_price: 9000, is_published: true },
  { o: 1, title: "PIXELFORGE", description: "Indie game studio mark, currently opposed - draft.", jurisdiction: "United States", registration_number: "US-90765432", status: "opposed", nice_class: 41, deal_type: "both", asking_price: null, is_published: false },
  { o: 1, title: "MERIDIAN", description: "Management consulting services mark.", jurisdiction: "United Kingdom", registration_number: "UK00003456705", status: "registered", nice_class: 35, deal_type: "license", asking_price: 21000, is_published: true },
  { o: 1, title: "TIDEWATER", description: "Sustainable swimwear brand, EU registration.", jurisdiction: "European Union", registration_number: "EU018456791", status: "registered", nice_class: 25, deal_type: "sale", asking_price: 27000, is_published: true },
  { o: 1, title: "QUANTA", description: "Fintech analytics platform word mark.", jurisdiction: "United States", registration_number: "US-90778800", status: "registered", nice_class: 36, deal_type: "license", asking_price: 64000, is_published: true },
  { o: 1, title: "GROVEHOUSE", description: "Artisan bakery chain mark.", jurisdiction: "United Kingdom", registration_number: "UK00003456712", status: "pending", nice_class: 43, deal_type: "both", asking_price: 18000, is_published: true },
  // Owner C
  { o: 2, title: "AURELIA", description: "Cosmetics and fragrance house, registered figurative mark.", jurisdiction: "European Union", registration_number: "EU018456792", status: "registered", nice_class: 3, deal_type: "license", asking_price: 41000, is_published: true },
  { o: 2, title: "CASTELLAN", description: "Legal-tech services mark for IP management.", jurisdiction: "United Kingdom", registration_number: "UK00003456713", status: "registered", nice_class: 45, deal_type: "license", asking_price: 33000, is_published: true },
  { o: 2, title: "OAKEN", description: "Craft whisky brand, available to acquire outright.", jurisdiction: "United Kingdom", registration_number: "UK00003456714", status: "registered", nice_class: 33, deal_type: "sale", asking_price: 75000, is_published: true },
  { o: 2, title: "PULSE", description: "Wearable health device brand, application pending.", jurisdiction: "United States", registration_number: "US-90790011", status: "pending", nice_class: 10, deal_type: "both", asking_price: 48000, is_published: true },
  { o: 2, title: "EMBER", description: "Smart-home heating brand - draft pending review.", jurisdiction: "European Union", registration_number: "EU018456793", status: "registered", nice_class: 11, deal_type: "license", asking_price: null, is_published: false },
];

async function findUserByEmail(email) {
  // listUsers is paginated; the test project is small so page 1 suffices.
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((u) => u.email === email) ?? null;
}

async function ensureOwner(owner) {
  let user = await findUserByEmail(owner.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: owner.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: owner.display_name },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  created ${owner.email}`);
  } else {
    console.log(`  exists  ${owner.email}`);
  }
  // Ensure profile reflects org/display name (trigger creates the row on signup).
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: owner.display_name,
      org_name: owner.org_name,
      verified: owner.verified ?? false,
    })
    .eq("id", user.id);
  if (error) throw error;
  return user;
}

async function main() {
  console.log("Seeding owners…");
  const users = [];
  for (const o of OWNERS) users.push(await ensureOwner(o));

  console.log("Clearing existing seed listings for these owners…");
  for (const u of users) {
    const { error } = await admin
      .from("ip_assets")
      .delete()
      .eq("owner_id", u.id)
      .eq("source", "user_submitted");
    if (error) throw error;
  }

  console.log("Inserting demo trademarks…");
  const rows = LISTINGS.map((l) => ({
    owner_id: users[l.o].id,
    type: "trademark",
    source: "user_submitted",
    title: l.title,
    description: l.description,
    jurisdiction: l.jurisdiction,
    registration_number: l.registration_number,
    status: l.status,
    nice_class: l.nice_class,
    deal_type: l.deal_type,
    asking_price: l.asking_price,
    is_published: l.is_published,
  }));
  const { error } = await admin.from("ip_assets").insert(rows);
  if (error) throw error;

  const published = rows.filter((r) => r.is_published).length;
  console.log(
    `Done. ${rows.length} listings (${published} published, ${rows.length - published} draft) across ${users.length} owners.`,
  );
  console.log(`Sign in as ${OWNERS[0].email} / ${TEST_PASSWORD} to demo.`);
}

// Only run when invoked directly (not when imported for OWNERS/TEST_PASSWORD).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Seed failed:", e.message ?? e);
    process.exit(1);
  });
}
