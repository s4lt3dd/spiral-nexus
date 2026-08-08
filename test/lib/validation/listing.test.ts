import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listingSchema } from "@/lib/validation/listing";

const SUPABASE_URL = "https://proj.supabase.co";
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/listing-images/`;
const OWNER = "3f0d1b2c-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

// The `images` refine reads NEXT_PUBLIC_SUPABASE_URL at validation time.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const minimal = { title: "Nimbus", deal_type: "sale" };
const parse = (input: Record<string, unknown>) => listingSchema.parse(input);
const fails = (input: Record<string, unknown>) =>
  listingSchema.safeParse(input).success === false;

describe("listingSchema — required fields", () => {
  it("accepts a minimal listing and fills defaults", () => {
    expect(parse(minimal)).toMatchObject({
      title: "Nimbus",
      deal_type: "sale",
      currency: "GBP",
      nice_classes: [],
      territory: [],
      images: [],
      is_published: false,
      license_renewable: null,
    });
  });

  it("requires a title", () => {
    expect(fails({ deal_type: "sale" })).toBe(true);
    expect(fails({ ...minimal, title: "" })).toBe(true);
    expect(fails({ ...minimal, title: "   " })).toBe(true);
  });

  it("trims the title and caps it at 120 characters", () => {
    expect(parse({ ...minimal, title: "  Nimbus  " }).title).toBe("Nimbus");
    expect(fails({ ...minimal, title: "x".repeat(121) })).toBe(true);
    expect(parse({ ...minimal, title: "x".repeat(120) }).title).toHaveLength(120);
  });

  it("requires a known deal type", () => {
    expect(fails({ title: "Nimbus" })).toBe(true);
    expect(fails({ ...minimal, deal_type: "auction" })).toBe(true);
    for (const d of ["license", "sale", "both"]) {
      expect(parse({ ...minimal, deal_type: d }).deal_type).toBe(d);
    }
  });

  it("accepts only the trademark status vocabulary", () => {
    expect(parse({ ...minimal, status: "registered" }).status).toBe("registered");
    // "granted" is patent vocabulary and must not leak in.
    expect(fails({ ...minimal, status: "granted" })).toBe(true);
  });

  it("accepts only curated currencies", () => {
    expect(parse({ ...minimal, currency: "JPY" }).currency).toBe("JPY");
    expect(fails({ ...minimal, currency: "XYZ" })).toBe(true);
  });
});

describe("listingSchema — empty form fields", () => {
  it("treats empty strings as 'not provided' rather than empty values", () => {
    const v = parse({
      ...minimal,
      description: "",
      jurisdiction: "   ",
      registration_number: "",
      status: "",
      office_url: "",
      filing_date: "",
      certificate_path: "",
    });
    expect(v.description).toBeUndefined();
    expect(v.jurisdiction).toBeUndefined();
    expect(v.status).toBeUndefined();
    expect(v.office_url).toBeUndefined();
    expect(v.filing_date).toBeUndefined();
    expect(v.certificate_path).toBeUndefined();
  });

  it("caps long free text", () => {
    expect(fails({ ...minimal, description: "x".repeat(4001) })).toBe(true);
    expect(fails({ ...minimal, encumbrances: "x".repeat(4001) })).toBe(true);
    expect(fails({ ...minimal, jurisdiction: "x".repeat(81) })).toBe(true);
  });
});

describe("listingSchema — nice_classes", () => {
  it("dedupes and sorts the selection", () => {
    expect(parse({ ...minimal, nice_classes: [25, 9, 25, 3] }).nice_classes).toEqual(
      [3, 9, 25],
    );
  });

  it("rejects classes outside 1–45 and non-integers", () => {
    expect(fails({ ...minimal, nice_classes: [0] })).toBe(true);
    expect(fails({ ...minimal, nice_classes: [46] })).toBe(true);
    expect(fails({ ...minimal, nice_classes: [9.5] })).toBe(true);
  });

  it("accepts the full range", () => {
    const all = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(parse({ ...minimal, nice_classes: all }).nice_classes).toEqual(all);
  });
});

describe("listingSchema — asking_price", () => {
  it("coerces a numeric form string", () => {
    expect(parse({ ...minimal, asking_price: "2500" }).asking_price).toBe(2500);
  });

  it("treats blank/null as no price rather than zero", () => {
    expect(parse({ ...minimal, asking_price: "" }).asking_price).toBeUndefined();
    expect(parse({ ...minimal, asking_price: null }).asking_price).toBeUndefined();
  });

  it("accepts a free listing priced at zero", () => {
    expect(parse({ ...minimal, asking_price: "0" }).asking_price).toBe(0);
  });

  it("rejects a negative price and non-numeric junk", () => {
    expect(fails({ ...minimal, asking_price: "-1" })).toBe(true);
    expect(fails({ ...minimal, asking_price: "free" })).toBe(true);
  });
});

describe("listingSchema — office_url", () => {
  it("accepts http and https links", () => {
    expect(parse({ ...minimal, office_url: "https://ipo.gov.uk/x" }).office_url).toBe(
      "https://ipo.gov.uk/x",
    );
    expect(parse({ ...minimal, office_url: "http://ipo.gov.uk/x" }).office_url).toBe(
      "http://ipo.gov.uk/x",
    );
  });

  // These would execute when rendered as an href.
  it("rejects javascript: and data: URLs", () => {
    expect(fails({ ...minimal, office_url: "javascript:alert(1)" })).toBe(true);
    expect(fails({ ...minimal, office_url: "data:text/html,<script>" })).toBe(true);
  });

  it("rejects a non-URL and an over-long URL", () => {
    expect(fails({ ...minimal, office_url: "not a url" })).toBe(true);
    expect(
      fails({ ...minimal, office_url: `https://x.example/${"a".repeat(2000)}` }),
    ).toBe(true);
  });
});

describe("listingSchema — filing_date", () => {
  it("accepts a past ISO date", () => {
    expect(parse({ ...minimal, filing_date: "2020-01-01" }).filing_date).toBe(
      "2020-01-01",
    );
  });

  it("rejects a clearly future date", () => {
    expect(fails({ ...minimal, filing_date: "2099-01-01" })).toBe(true);
  });

  // +24h tolerance so a user ahead of UTC can file "today".
  it("accepts today even for a user ahead of UTC", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(fails({ ...minimal, filing_date: today })).toBe(false);
  });

  it("rejects a malformed date shape", () => {
    expect(fails({ ...minimal, filing_date: "01/01/2020" })).toBe(true);
    expect(fails({ ...minimal, filing_date: "2020-1-1" })).toBe(true);
  });

  // Passes the regex but is not a real date — must not slip through as NaN.
  it("rejects a well-shaped but impossible date", () => {
    expect(fails({ ...minimal, filing_date: "2020-13-45" })).toBe(true);
  });

  it("rejects a date before trademark registries existed", () => {
    expect(fails({ ...minimal, filing_date: "1800-01-01" })).toBe(true);
  });
});

describe("listingSchema — license_renewable tri-state", () => {
  it("keeps true and false distinct from unspecified", () => {
    expect(parse({ ...minimal, license_renewable: true }).license_renewable).toBe(
      true,
    );
    expect(parse({ ...minimal, license_renewable: false }).license_renewable).toBe(
      false,
    );
    expect(parse({ ...minimal, license_renewable: "" }).license_renewable).toBeNull();
    expect(parse(minimal).license_renewable).toBeNull();
  });

  it("rejects a non-boolean value", () => {
    expect(fails({ ...minimal, license_renewable: "yes" })).toBe(true);
  });
});

describe("listingSchema — certificate_path", () => {
  it("accepts a '<uuid>/<file>' storage path", () => {
    expect(
      parse({ ...minimal, certificate_path: `${OWNER}/cert.pdf` }).certificate_path,
    ).toBe(`${OWNER}/cert.pdf`);
  });

  // Ownership of the prefix is enforced in the server action; the shape is
  // enforced here so a traversal or absolute path never reaches it.
  it("rejects traversal, absolute and bucket-crossing paths", () => {
    expect(fails({ ...minimal, certificate_path: "../../etc/passwd" })).toBe(true);
    expect(fails({ ...minimal, certificate_path: `/${OWNER}/cert.pdf` })).toBe(true);
    expect(fails({ ...minimal, certificate_path: `${OWNER}/../other/c.pdf` })).toBe(
      true,
    );
    expect(fails({ ...minimal, certificate_path: "cert.pdf" })).toBe(true);
  });
});

describe("listingSchema — images", () => {
  it("accepts images uploaded to our public listing bucket", () => {
    const url = `${BUCKET}${OWNER}/mark.png`;
    expect(parse({ ...minimal, images: [url] }).images).toEqual([url]);
  });

  // Otherwise a crafted payload makes every viewer's browser fetch an
  // attacker-controlled host.
  it("rejects images hosted anywhere else", () => {
    expect(fails({ ...minimal, images: ["https://evil.example/x.png"] })).toBe(true);
    expect(
      fails({
        ...minimal,
        images: [`https://other.supabase.co/storage/v1/object/public/listing-images/x.png`],
      }),
    ).toBe(true);
  });

  it("rejects a non-http image URL", () => {
    expect(fails({ ...minimal, images: ["javascript:alert(1)"] })).toBe(true);
  });

  it("caps the gallery at six images", () => {
    const six = Array.from({ length: 6 }, (_, i) => `${BUCKET}${OWNER}/${i}.png`);
    expect(parse({ ...minimal, images: six }).images).toHaveLength(6);
    expect(fails({ ...minimal, images: [...six, `${BUCKET}${OWNER}/6.png`] })).toBe(
      true,
    );
  });
});

describe("listingSchema — territory", () => {
  it("accepts a country list and caps it", () => {
    expect(parse({ ...minimal, territory: ["United Kingdom"] }).territory).toEqual([
      "United Kingdom",
    ]);
    expect(
      fails({ ...minimal, territory: Array.from({ length: 61 }, () => "UK") }),
    ).toBe(true);
  });

  it("rejects blank entries", () => {
    expect(fails({ ...minimal, territory: [""] })).toBe(true);
    expect(fails({ ...minimal, territory: ["   "] })).toBe(true);
  });
});

describe("listingSchema — column whitelist", () => {
  // The schema is the whitelist of writable columns. Anything not declared must
  // be stripped so a crafted payload can't write it.
  it("strips columns the user must never set", () => {
    const v = parse({
      ...minimal,
      owner_id: "someone-else",
      mark_image_url: "https://evil.example/x.png",
      created_at: "1999-01-01",
      source: "manual",
    }) as Record<string, unknown>;

    expect(v.owner_id).toBeUndefined();
    expect(v.mark_image_url).toBeUndefined();
    expect(v.created_at).toBeUndefined();
    expect(v.source).toBeUndefined();
  });
});
