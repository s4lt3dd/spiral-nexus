import { describe, expect, it } from "vitest";

import { contactSchema, messageSchema } from "@/lib/validation/message";

const UUID = "3f0d1b2c-4e5f-4a6b-8c9d-0e1f2a3b4c5d";

describe("contactSchema", () => {
  it("accepts a valid first-contact payload", () => {
    expect(contactSchema.parse({ listingId: UUID, body: "Interested" })).toEqual({
      listingId: UUID,
      body: "Interested",
    });
  });

  // A non-UUID id must be rejected at the boundary, not handed to Postgres.
  it("rejects a listing id that is not a UUID", () => {
    expect(contactSchema.safeParse({ listingId: "1", body: "hi" }).success).toBe(
      false,
    );
    expect(
      contactSchema.safeParse({ listingId: "' OR 1=1--", body: "hi" }).success,
    ).toBe(false);
  });

  it("requires a listing id", () => {
    expect(contactSchema.safeParse({ body: "hi" }).success).toBe(false);
  });
});

describe("messageSchema", () => {
  it("accepts a valid reply", () => {
    expect(
      messageSchema.parse({ conversationId: UUID, body: "  hello  " }),
    ).toEqual({ conversationId: UUID, body: "hello" });
  });

  it("rejects a conversation id that is not a UUID", () => {
    expect(
      messageSchema.safeParse({ conversationId: "abc", body: "hi" }).success,
    ).toBe(false);
  });
});

describe("message body rules", () => {
  const parseBody = (body: unknown) =>
    messageSchema.safeParse({ conversationId: UUID, body });

  it("trims surrounding whitespace", () => {
    expect(parseBody("\n  hello \t ").data?.body).toBe("hello");
  });

  it("rejects an empty or whitespace-only message", () => {
    expect(parseBody("").success).toBe(false);
    expect(parseBody("   \n\t ").success).toBe(false);
    expect(parseBody(undefined).success).toBe(false);
  });

  it("caps the body at 2000 characters", () => {
    expect(parseBody("x".repeat(2000)).success).toBe(true);
    expect(parseBody("x".repeat(2001)).success).toBe(false);
  });

  it("rejects a non-string body", () => {
    expect(parseBody(42).success).toBe(false);
    expect(parseBody({ text: "hi" }).success).toBe(false);
  });

  // Escaping is a rendering concern; the schema must not silently mangle text.
  it("preserves message content verbatim", () => {
    const body = "Can we discuss <Nimbus> & the £50k figure?";
    expect(parseBody(body).data?.body).toBe(body);
  });
});
