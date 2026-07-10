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

// Avatar monogram (round gradient + initials) as an inline SVG data URI — same
// approach as the listing marks, so the demo has real avatars with no host.
function avatarDataUri(initials, c1, c2) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">` +
    `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<circle cx="48" cy="48" r="48" fill="url(#a)"/>` +
    `<text x="48" y="62" text-anchor="middle" fill="#ffffff" ` +
    `font-family="Georgia, 'Times New Roman', serif" font-size="38" font-weight="600">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Richer profiles so the home, public profiles, and the future directory demo
// well. onboarded_at is set so signing in as a seed user lands on the profile
// home (no onboarding redirect). Owner B is intentionally left lighter (no bio,
// no sectors, no avatar) to demo the completion nudge.
export const OWNERS = [
  {
    email: "owner-a@spiralnexus.test",
    display_name: "Ava Owner",
    org_name: "Northwind Brands",
    verified: true,
    headline: "Trademark portfolio owner & licensor",
    bio: "I build and license consumer brands across the UK and EU. Northwind holds a registered portfolio in tech, beauty, and apparel — open to licensing deals and select sales.",
    location: "London, UK",
    country: "United Kingdom",
    website: "https://northwind.example.com",
    linkedin_url: "https://linkedin.com/in/ava-owner",
    avatar_url: avatarDataUri("AO", "#7C3AED", "#4F46E5"),
    role_flags: ["owner", "licensee"],
    sectors: ["Technology & Software", "Beauty & Cosmetics", "Fashion & Apparel"],
    nice_class_interests: [3, 9, 25],
    jurisdictions: ["United Kingdom", "European Union"],
  },
  {
    email: "owner-b@spiralnexus.test",
    display_name: "Ben Owner",
    org_name: "Lumen Studio",
    verified: false,
    headline: "Design studio with marks to license",
    location: "Manchester, UK",
    country: "United Kingdom",
    website: "https://lumen.example.com",
    linkedin_url: null,
    avatar_url: null,
    role_flags: ["owner"],
    sectors: [],
    nice_class_interests: [11, 20],
    jurisdictions: ["United Kingdom"],
  },
  {
    email: "owner-c@spiralnexus.test",
    display_name: "Cara Owner",
    org_name: "Castellan IP",
    verified: true,
    headline: "IP counsel — buying & licensing brands",
    bio: "Castellan advises on trademark acquisition and licensing for clients in food & beverage, hospitality, and professional services. Always looking for clean, registered marks.",
    location: "Edinburgh, UK",
    country: "United Kingdom",
    website: "https://castellan.example.com",
    linkedin_url: "https://linkedin.com/in/cara-owner",
    avatar_url: avatarDataUri("CO", "#5B21B6", "#312E81"),
    role_flags: ["buyer", "licensee", "investor"],
    sectors: ["Food & Beverage", "Hospitality & Travel", "Professional Services"],
    nice_class_interests: [33, 43, 45],
    jurisdictions: ["United Kingdom", "European Union", "United States"],
  },
];

// Directory-only members (Slice 5): signed-up people with NO listings, so the
// Connect directory and its role/sector/jurisdiction filters demo with real
// variety across all four intents (owner | buyer | licensee | investor).
export const MEMBERS = [
  {
    email: "member-d@spiralnexus.test",
    display_name: "Dana Reed",
    org_name: "Reed Ventures",
    verified: true,
    headline: "Early-stage investor in brands & IP",
    bio: "I back consumer and fintech brands and acquire dormant trademarks with upside. Happy to talk to owners and licensees.",
    location: "London, UK",
    country: "United Kingdom",
    website: "https://reedventures.example.com",
    linkedin_url: "https://linkedin.com/in/dana-reed",
    avatar_url: avatarDataUri("DR", "#7C3AED", "#4F46E5"),
    role_flags: ["investor", "buyer"],
    sectors: ["Technology & Software", "Financial Services"],
    nice_class_interests: [9, 36],
    jurisdictions: ["United Kingdom", "United States"],
  },
  {
    email: "member-e@spiralnexus.test",
    display_name: "Eli Marsh",
    org_name: "Marsh & Loom",
    verified: false,
    headline: "Licensee — apparel & lifestyle brands",
    bio: "Building a multi-brand apparel group; actively licensing registered marks for EU and UK retail.",
    location: "Leeds, UK",
    country: "United Kingdom",
    website: "https://marshloom.example.com",
    linkedin_url: null,
    avatar_url: null,
    role_flags: ["licensee"],
    sectors: ["Fashion & Apparel", "Consumer Goods"],
    nice_class_interests: [25, 18],
    jurisdictions: ["United Kingdom", "European Union"],
  },
  {
    email: "member-f@spiralnexus.test",
    display_name: "Farah Niu",
    org_name: "Aster Capital",
    verified: true,
    headline: "Investor — beauty, wellness & DTC",
    bio: "Aster invests in beauty and wellness brands across the EU. Interested in IP-rich, registered portfolios.",
    location: "Paris, France",
    country: "France",
    website: "https://astercapital.example.com",
    linkedin_url: "https://linkedin.com/in/farah-niu",
    avatar_url: avatarDataUri("FN", "#7E22CE", "#4F46E5"),
    role_flags: ["investor"],
    sectors: ["Beauty & Cosmetics", "Health & Wellness"],
    nice_class_interests: [3, 5],
    jurisdictions: ["European Union"],
  },
  {
    email: "member-g@spiralnexus.test",
    display_name: "Greg Hollis",
    org_name: null,
    verified: false,
    headline: "Buyer — food & hospitality brands",
    bio: null,
    location: "Bristol, UK",
    country: "United Kingdom",
    website: null,
    linkedin_url: null,
    avatar_url: null,
    role_flags: ["buyer"],
    sectors: ["Food & Beverage", "Hospitality & Travel"],
    nice_class_interests: [43, 33],
    jurisdictions: ["United Kingdom"],
  },
  {
    email: "member-h@spiralnexus.test",
    display_name: "Hana Okoye",
    org_name: "Okoye Media",
    verified: true,
    headline: "Licensing media & entertainment IP",
    bio: "Producer licensing brands and characters for film, streaming, and games. Buyer for the right marks.",
    location: "New York, USA",
    country: "United States",
    website: "https://okoyemedia.example.com",
    linkedin_url: "https://linkedin.com/in/hana-okoye",
    avatar_url: avatarDataUri("HO", "#6D28D9", "#9333EA"),
    role_flags: ["licensee", "buyer"],
    sectors: ["Media & Entertainment", "Technology & Software"],
    nice_class_interests: [41, 9],
    jurisdictions: ["United States", "WIPO (International)"],
  },
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
  { o: 0, title: "NIMBUSWEAR", description: "Athleisure clothing label, prefix-shares the Nimbus family name.", jurisdiction: "United Kingdom", registration_number: "UK00003456710", status: "registered", nice_classes: [18, 25], deal_type: "both", asking_price: 30000, is_published: true },
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
  { o: 2, title: "AURELIA", description: "Cosmetics and fragrance house, registered figurative mark.", jurisdiction: "European Union", registration_number: "EU018456792", status: "registered", nice_classes: [3, 5], deal_type: "license", asking_price: 41000, is_published: true },
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
  // Ensure profile reflects the full demo identity (trigger creates the row on
  // signup). Runs with the service role, which bypasses the column-level GRANT,
  // so it can set `verified` — users themselves never can.
  const { error } = await admin
    .from("profiles")
    .update({
      display_name: owner.display_name,
      org_name: owner.org_name,
      verified: owner.verified ?? false,
      headline: owner.headline ?? null,
      bio: owner.bio ?? null,
      location: owner.location ?? null,
      country: owner.country ?? null,
      website: owner.website ?? null,
      linkedin_url: owner.linkedin_url ?? null,
      avatar_url: owner.avatar_url ?? null,
      role_flags: owner.role_flags ?? ["buyer"],
      sectors: owner.sectors ?? [],
      nice_class_interests: owner.nice_class_interests ?? [],
      jurisdictions: owner.jurisdictions ?? [],
      onboarded_at: "2026-06-01T00:00:00Z",
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
  // Slice B fields are derived from the base data so every expanded detail
  // page demos non-empty: currency/territory follow the office, filing dates
  // are spread deterministically, license deals carry duration + renewal.
  const territoryFor = {
    "United Kingdom": ["United Kingdom"],
    "United States": ["United States"],
    "European Union": ["European Union (all member states)"],
  };
  const currencyFor = {
    "United Kingdom": "GBP",
    "United States": "USD",
    "European Union": "EUR",
  };
  const officeUrlFor = {
    "United Kingdom": "https://www.gov.uk/search-for-trademark",
    "United States": "https://tmsearch.uspto.gov/",
    "European Union": "https://euipo.europa.eu/eSearch/",
  };
  const rows = LISTINGS.map((l, i) => ({
    owner_id: users[l.o].id,
    type: "trademark",
    source: "user_submitted",
    title: l.title,
    description: l.description,
    jurisdiction: l.jurisdiction,
    registration_number: l.registration_number,
    status: l.status,
    nice_classes: l.nice_classes ?? [l.nice_class],
    deal_type: l.deal_type,
    asking_price: l.asking_price,
    currency: currencyFor[l.jurisdiction] ?? "GBP",
    office_url: officeUrlFor[l.jurisdiction] ?? null,
    territory: territoryFor[l.jurisdiction] ?? [l.jurisdiction],
    filing_date: `20${14 + (i % 9)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    license_duration: l.deal_type !== "sale" ? `${3 + (i % 5)} years` : null,
    license_renewable: l.deal_type !== "sale" ? i % 3 !== 2 : null,
    encumbrances:
      i % 5 === 0
        ? "One existing non-exclusive license in force (retail, expires next year)."
        : null,
    quality_control:
      i % 4 === 0
        ? "Licensee samples subject to approval before each production run."
        : null,
    mark_image_url: markDataUri(l.title, i),
    is_published: l.is_published,
  }));
  const { error } = await admin.from("ip_assets").insert(rows);
  if (error) throw error;

  const published = rows.filter((r) => r.is_published).length;
  console.log(
    `Done. ${rows.length} listings (${published} published, ${rows.length - published} draft) across ${users.length} owners.`,
  );

  // Directory-only members (no listings). ensureOwner is profile-generic, so it
  // sets up each member's auth user + profile the same way.
  console.log("Seeding directory members…");
  const members = [];
  for (const m of MEMBERS) members.push(await ensureOwner(m));
  console.log(`Done. ${MEMBERS.length} directory members.`);

  await seedMessages(users);
  await seedSaved(users);
  await seedFollows(users, members);
  await seedLikes(users, members);

  console.log(`Sign in as ${OWNERS[0].email} / ${TEST_PASSWORD} to demo.`);
}

// Seed a follow graph so follower/following counts demo non-empty. Members
// follow the verified owners; owners follow each other; a couple of member↔
// member edges. Idempotent; tolerant of the follows migration not being applied.
async function seedFollows(owners, members) {
  const probe = await admin.from("follows").select("follower_id").limit(1);
  if (probe.error) {
    console.log(
      "Skipping follows seed — follows table not found. Run `npm run db:push`, then re-run this seed.",
    );
    return;
  }

  const all = [...owners, ...members];
  const seedIds = all.map((u) => u.id);
  // Clean reseed of edges touching any seed account.
  await admin.from("follows").delete().in("follower_id", seedIds);

  const edges = [];
  // Every member follows owner A and owner C (the verified owners).
  for (const m of members) {
    edges.push({ follower_id: m.id, following_id: owners[0].id });
    edges.push({ follower_id: m.id, following_id: owners[2].id });
  }
  // Owners follow each other in a ring: A→B, B→C, C→A.
  edges.push({ follower_id: owners[0].id, following_id: owners[1].id });
  edges.push({ follower_id: owners[1].id, following_id: owners[2].id });
  edges.push({ follower_id: owners[2].id, following_id: owners[0].id });
  // A couple of member↔member edges for variety.
  if (members.length >= 3) {
    edges.push({ follower_id: members[0].id, following_id: members[2].id });
    edges.push({ follower_id: members[2].id, following_id: members[0].id });
  }

  const { error } = await admin
    .from("follows")
    .upsert(edges, {
      onConflict: "follower_id,following_id",
      ignoreDuplicates: true,
    });
  if (error) throw error;
  console.log(`Seeded ${edges.length} follow edge(s).`);
}

// Seed a few saved listings so /saved demos non-empty: owner C bookmarks a
// couple of owner A's published marks. Idempotent; tolerant of the
// saved_listings migration not being applied yet.
async function seedSaved(users) {
  const probe = await admin.from("saved_listings").select("user_id").limit(1);
  if (probe.error) {
    console.log(
      "Skipping saved seed — saved_listings table not found. Run `npm run db:push`, then re-run this seed.",
    );
    return;
  }

  const saver = users[2]; // owner C
  const { data: aListings } = await admin
    .from("ip_assets")
    .select("id")
    .eq("owner_id", users[0].id)
    .eq("is_published", true)
    .limit(3);
  if (!saver || !aListings || aListings.length === 0) return;

  const rows = aListings.map((l) => ({ user_id: saver.id, listing_id: l.id }));
  const { error } = await admin
    .from("saved_listings")
    .upsert(rows, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) throw error;
  console.log(`Seeded ${rows.length} saved listing(s) for ${OWNERS[2].email}.`);
}

// Seed likes across owners + members so counts, the activity tab, and the
// notifications panel all demo non-empty. Tolerant of the engagement
// migration not being applied yet.
async function seedLikes(users, members) {
  const probe = await admin.from("listing_likes").select("user_id").limit(1);
  if (probe.error) {
    console.log(
      "Skipping likes seed — listing_likes table not found. Run `npm run db:push`, then re-run this seed.",
    );
    return;
  }

  const { data: published } = await admin
    .from("ip_assets")
    .select("id, owner_id")
    .eq("is_published", true)
    .order("created_at", { ascending: true });
  if (!published?.length) return;

  const likers = [...users, ...members];
  const rows = [];
  // Deterministic spread: each liker likes every 3rd listing offset by their
  // index, skipping their own — varied counts without randomness.
  likers.forEach((liker, li) => {
    published.forEach((l, i) => {
      if (l.owner_id === liker.id) return;
      if ((i + li) % 3 !== 0) return;
      rows.push({ user_id: liker.id, listing_id: l.id });
    });
  });

  const { error } = await admin
    .from("listing_likes")
    .upsert(rows, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) throw error;
  console.log(`Seeded ${rows.length} like(s) across ${likers.length} members.`);
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
