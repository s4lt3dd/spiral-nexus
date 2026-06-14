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

// Branded mark images for the seed. Each listing gets a distinct gradient
// "medallion" wordmark rendered as an inline SVG data URI — no external host,
// deterministic, and on-brand (purple/indigo family per design-system MASTER).
// This is what fills the mark block on the browse card and detail page so the
// demo reads as a real marketplace instead of a wall of grey placeholders.
const MARK_GRADIENTS = [
  ["#7C3AED", "#4F46E5"], // brand violet -> indigo
  ["#6D28D9", "#4338CA"], // purple -> deep indigo
  ["#5B21B6", "#312E81"], // plum -> midnight indigo
  ["#7E22CE", "#4F46E5"], // fuchsia-purple -> indigo
  ["#2C1A57", "#5B3F86"], // hero dark -> muted violet
  ["#6D28D9", "#9333EA"], // purple -> violet
];

function xmlEscape(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c],
  );
}

// Build a gradient wordmark medallion (16:10) for a listing title.
function markDataUri(title, idx) {
  const [c1, c2] = MARK_GRADIENTS[idx % MARK_GRADIENTS.length];
  const initial = (title.match(/[A-Za-z0-9]/)?.[0] ?? "•").toUpperCase();
  const word = xmlEscape(title);
  // Compress only long wordmarks so nothing overflows the padded tile.
  const est = title.length * 22;
  const fit = est > 320 ? ` textLength="320" lengthAdjust="spacingAndGlyphs"` : "";
  const gid = `g${idx}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="250" rx="24" fill="url(#${gid})"/>` +
    // Faint concentric "Nexus" rings, bottom-right, for depth.
    `<g fill="none" stroke="#ffffff" stroke-opacity="0.12">` +
    `<circle cx="372" cy="226" r="26"/><circle cx="372" cy="226" r="46"/>` +
    `<circle cx="372" cy="226" r="66"/></g>` +
    // Monogram chip.
    `<rect x="168" y="44" width="64" height="64" rx="16" fill="#ffffff" fill-opacity="0.16"/>` +
    `<text x="200" y="88" text-anchor="middle" fill="#ffffff" ` +
    `font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700">${initial}</text>` +
    // Wordmark.
    `<text x="200" y="172" text-anchor="middle" fill="#ffffff"${fit} ` +
    `font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="600" letter-spacing="1.5">${word}</text>` +
    // Quiet domain label.
    `<text x="200" y="200" text-anchor="middle" fill="#ffffff" fill-opacity="0.6" ` +
    `font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="600" letter-spacing="3">TRADEMARK</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
  const rows = LISTINGS.map((l, i) => ({
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
    mark_image_url: markDataUri(l.title, i),
    is_published: l.is_published,
  }));
  const { error } = await admin.from("ip_assets").insert(rows);
  if (error) throw error;

  const published = rows.filter((r) => r.is_published).length;
  console.log(
    `Done. ${rows.length} listings (${published} published, ${rows.length - published} draft) across ${users.length} owners.`,
  );

  await seedMessages(users);

  console.log(`Sign in as ${OWNERS[0].email} / ${TEST_PASSWORD} to demo.`);
}

// Seed a few conversations so the inbox demos. One thread is addressed to the
// first REAL (non-seed) user as the buyer, so you can test messaging in a
// single window without a second account. Tolerant of the messaging migration
// not being applied yet.
async function seedMessages(users) {
  const probe = await admin.from("conversations").select("id").limit(1);
  if (probe.error) {
    console.log(
      "Skipping messaging seed — messaging tables not found. Run `npm run db:push`, then re-run this seed.",
    );
    return;
  }

  const seedIds = users.map((u) => u.id);
  // Clear prior seed conversations (messages cascade) for a clean reseed.
  await admin.from("conversations").delete().in("owner_id", seedIds);
  await admin.from("conversations").delete().in("buyer_id", seedIds);

  // Anchor threads on owner-a's published listings.
  const { data: aListings } = await admin
    .from("ip_assets")
    .select("id, title")
    .eq("owner_id", users[0].id)
    .eq("is_published", true)
    .limit(2);
  if (!aListings || aListings.length === 0) return;

  // First real (non-seed) user plays the buyer in a demo thread.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  const realBuyer = list.users.find(
    (u) => u.email && !u.email.endsWith("@spiralnexus.test"),
  );

  async function thread(listing, buyerId, ownerId, lines) {
    const { data: convo, error } = await admin
      .from("conversations")
      .insert({ listing_id: listing.id, buyer_id: buyerId, owner_id: ownerId })
      .select("id")
      .single();
    if (error) throw error;
    for (const [senderId, body] of lines) {
      const { error: me } = await admin
        .from("messages")
        .insert({ conversation_id: convo.id, sender_id: senderId, body });
      if (me) throw me;
    }
  }

  let count = 0;
  if (realBuyer && realBuyer.id !== users[0].id) {
    const l = aListings[0];
    await thread(l, realBuyer.id, users[0].id, [
      [realBuyer.id, `Hi — is ${l.title} still available to license? We're exploring it for a new product line.`],
      [users[0].id, `Hi! Yes, ${l.title} is available. Happy to talk terms — what did you have in mind?`],
    ]);
    count++;
  }
  if (users[1] && aListings[1]) {
    const l = aListings[1];
    await thread(l, users[1].id, users[0].id, [
      [users[1].id, `Interested in ${l.title} for the EU market — is a full sale on the table?`],
      [users[0].id, `Potentially — it's registered and clean. Let's discuss numbers.`],
    ]);
    count++;
  }

  console.log(
    `Seeded ${count} conversation(s).` +
      (realBuyer
        ? ` One is addressed to ${realBuyer.email} — sign in as that account and open /messages.`
        : " (No real user found yet — sign in once, then re-run to get a demo thread in your inbox.)"),
  );
}

// Only run when invoked directly (not when imported for OWNERS/TEST_PASSWORD).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error("Seed failed:", e.message ?? e);
    process.exit(1);
  });
}
