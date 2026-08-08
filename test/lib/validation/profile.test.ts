import { describe, expect, it } from "vitest";

import { profileSchema } from "@/lib/validation/profile";

const minimal = { display_name: "Ada Lovelace" };
const parse = (input: Record<string, unknown>) => profileSchema.parse(input);
const fails = (input: Record<string, unknown>) =>
  profileSchema.safeParse(input).success === false;

describe("profileSchema — display name", () => {
  it("accepts a minimal profile and defaults the multi-selects to empty", () => {
    expect(parse(minimal)).toMatchObject({
      display_name: "Ada Lovelace",
      role_flags: [],
      sectors: [],
      jurisdictions: [],
      nice_class_interests: [],
    });
  });

  // Founder decision: no nameless "Spiral Nexus member" ghosts. This is the one
  // server-side enforcement point for both onboarding and later edits, so a
  // name can never be omitted OR cleared afterwards.
  it("requires a name and rejects a whitespace-only one", () => {
    expect(fails({})).toBe(true);
    expect(fails({ display_name: "" })).toBe(true);
    expect(fails({ display_name: "   " })).toBe(true);
    expect(fails({ display_name: null })).toBe(true);
  });

  it("trims the name and caps it at 80 characters", () => {
    expect(parse({ display_name: "  Ada  " }).display_name).toBe("Ada");
    expect(fails({ display_name: "x".repeat(81) })).toBe(true);
  });
});

describe("profileSchema — privilege whitelist", () => {
  // The schema deliberately omits verified / subscription_tier /
  // stripe_customer_id. If any of these survived, a user could self-verify or
  // self-upgrade by posting an extra form field.
  it("strips self-verification and self-upgrade fields", () => {
    const v = parse({
      ...minimal,
      verified: true,
      subscription_tier: "enterprise",
      stripe_customer_id: "cus_123",
      id: "someone-else",
      onboarded_at: "1999-01-01",
    }) as Record<string, unknown>;

    expect(v.verified).toBeUndefined();
    expect(v.subscription_tier).toBeUndefined();
    expect(v.stripe_customer_id).toBeUndefined();
    expect(v.id).toBeUndefined();
    expect(v.onboarded_at).toBeUndefined();
  });

  it("emits no column outside the editable whitelist", () => {
    const full = parse({
      display_name: "Ada Lovelace",
      org_name: "Analytical",
      headline: "IP counsel",
      bio: "Twenty years in trademarks.",
      location: "London",
      country: "United Kingdom",
      avatar_url: "https://cdn.example/a.png",
      website: "https://ada.example",
      linkedin_url: "https://linkedin.com/in/ada",
      role_flags: ["owner"],
      sectors: ["Automotive"],
      jurisdictions: ["United Kingdom"],
      nice_class_interests: [9],
    });

    expect(Object.keys(full).sort()).toEqual(
      [
        "avatar_url",
        "bio",
        "country",
        "display_name",
        "headline",
        "jurisdictions",
        "linkedin_url",
        "location",
        "nice_class_interests",
        "org_name",
        "role_flags",
        "sectors",
        "website",
      ].sort(),
    );
  });

  it("omits absent optional columns rather than writing nulls over them", () => {
    expect(Object.keys(parse(minimal)).sort()).toEqual([
      "display_name",
      "jurisdictions",
      "nice_class_interests",
      "role_flags",
      "sectors",
    ]);
  });
});

describe("profileSchema — optional text", () => {
  it("treats empty strings as not provided", () => {
    const v = parse({
      ...minimal,
      org_name: "",
      headline: "   ",
      bio: "",
      location: "",
      country: "",
    });
    expect(v.org_name).toBeUndefined();
    expect(v.headline).toBeUndefined();
    expect(v.bio).toBeUndefined();
    expect(v.country).toBeUndefined();
  });

  it("caps each free-text field", () => {
    expect(fails({ ...minimal, org_name: "x".repeat(121) })).toBe(true);
    expect(fails({ ...minimal, headline: "x".repeat(141) })).toBe(true);
    expect(fails({ ...minimal, bio: "x".repeat(1001) })).toBe(true);
    expect(fails({ ...minimal, location: "x".repeat(121) })).toBe(true);
  });
});

describe("profileSchema — URLs", () => {
  it("accepts http(s) links for every URL field", () => {
    const v = parse({
      ...minimal,
      avatar_url: "https://cdn.example/a.png",
      website: "http://ada.example",
      linkedin_url: "https://linkedin.com/in/ada",
    });
    expect(v.avatar_url).toBe("https://cdn.example/a.png");
    expect(v.website).toBe("http://ada.example");
    expect(v.linkedin_url).toBe("https://linkedin.com/in/ada");
  });

  // Rendered as hrefs and img srcs on a public profile.
  it("rejects javascript: and data: URLs on every URL field", () => {
    for (const field of ["avatar_url", "website", "linkedin_url"]) {
      expect(fails({ ...minimal, [field]: "javascript:alert(1)" })).toBe(true);
      expect(fails({ ...minimal, [field]: "data:text/html,<script>" })).toBe(true);
    }
  });

  it("rejects a non-URL string but allows the field to be blank", () => {
    expect(fails({ ...minimal, website: "ada.example" })).toBe(true);
    expect(parse({ ...minimal, website: "" }).website).toBeUndefined();
  });
});

describe("profileSchema — controlled vocabularies", () => {
  it("accepts declared roles and rejects invented ones", () => {
    expect(parse({ ...minimal, role_flags: ["owner", "investor"] }).role_flags).toEqual(
      ["owner", "investor"],
    );
    expect(fails({ ...minimal, role_flags: ["admin"] })).toBe(true);
  });

  it("caps role selection at the four declared roles", () => {
    expect(
      fails({
        ...minimal,
        role_flags: ["owner", "buyer", "licensee", "investor", "owner"],
      }),
    ).toBe(true);
  });

  it("accepts declared sectors, jurisdictions and countries only", () => {
    const v = parse({
      ...minimal,
      sectors: ["Automotive"],
      jurisdictions: ["United Kingdom"],
      country: "Japan",
    });
    expect(v.sectors).toEqual(["Automotive"]);
    expect(v.jurisdictions).toEqual(["United Kingdom"]);
    expect(v.country).toBe("Japan");

    expect(fails({ ...minimal, sectors: ["Crypto"] })).toBe(true);
    expect(fails({ ...minimal, jurisdictions: ["Mars"] })).toBe(true);
    expect(fails({ ...minimal, country: "Atlantis" })).toBe(true);
  });
});

describe("profileSchema — nice_class_interests", () => {
  it("coerces numeric strings from the form", () => {
    expect(
      parse({ ...minimal, nice_class_interests: ["9", "25"] }).nice_class_interests,
    ).toEqual([9, 25]);
  });

  it("rejects classes outside 1–45", () => {
    expect(fails({ ...minimal, nice_class_interests: [0] })).toBe(true);
    expect(fails({ ...minimal, nice_class_interests: [46] })).toBe(true);
    expect(fails({ ...minimal, nice_class_interests: ["nine"] })).toBe(true);
  });

  it("caps the selection at 45", () => {
    const all = Array.from({ length: 45 }, (_, i) => i + 1);
    expect(parse({ ...minimal, nice_class_interests: all }).nice_class_interests)
      .toHaveLength(45);
    expect(fails({ ...minimal, nice_class_interests: [...all, 1] })).toBe(true);
  });
});
