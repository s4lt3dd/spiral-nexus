import { describe, expect, it } from "vitest";

import { loadInboxRows } from "@/lib/inbox";
import { createSupabaseMock } from "../helpers/supabase-mock";

const ME = "user-me";
const THEM = "user-them";

const conversation = (over: Record<string, unknown> = {}) => ({
  id: "c1",
  buyer_id: ME,
  owner_id: THEM,
  last_message_at: "2026-08-08T10:00:00Z",
  listing: { title: "Nimbus" },
  buyer: { display_name: "Me", org_name: null },
  owner: { display_name: "Ada", org_name: null },
  ...over,
});

const msg = (over: Record<string, unknown> = {}) => ({
  conversation_id: "c1",
  body: "hello",
  sender_id: THEM,
  created_at: "2026-08-08T10:00:00Z",
  ...over,
});

function mockInbox(opts: {
  conversations?: unknown[];
  messages?: unknown[];
  reads?: unknown[];
}) {
  return createSupabaseMock({
    tables: {
      conversations: { data: opts.conversations ?? [] },
      messages: { data: opts.messages ?? [] },
      conversation_reads: { data: opts.reads ?? [] },
    },
  });
}

describe("loadInboxRows", () => {
  it("returns nothing and skips the follow-up queries with no conversations", async () => {
    const mock = mockInbox({});
    const rows = await loadInboxRows(mock.client, ME);

    expect(rows).toEqual([]);
    expect(mock.forTable("messages")).toHaveLength(0);
    expect(mock.forTable("conversation_reads")).toHaveLength(0);
  });

  it("orders threads by most recent message", async () => {
    const mock = mockInbox({ conversations: [conversation()] });
    await loadInboxRows(mock.client, ME);

    expect(mock.forTable("conversations")[0].argsFor("order")).toEqual([
      "last_message_at",
      { ascending: false },
    ]);
  });

  // The row must name the OTHER party — showing the viewer their own name is
  // the classic inbox bug.
  it("names the owner when the viewer is the buyer", async () => {
    const mock = mockInbox({ conversations: [conversation()] });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.otherName).toBe("Ada");
    expect(row.otherInitial).toBe("A");
  });

  it("names the buyer when the viewer is the owner", async () => {
    const mock = mockInbox({
      conversations: [conversation({ buyer_id: THEM, owner_id: ME })],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.otherName).toBe("Me");
  });

  it("falls back to the org name, then a generic label", async () => {
    const mock = mockInbox({
      conversations: [
        conversation({ owner: { display_name: null, org_name: "Acme IP" } }),
        conversation({ id: "c2", owner: null }),
      ],
    });
    const [withOrg, nameless] = await loadInboxRows(mock.client, ME);

    expect(withOrg.otherName).toBe("Acme IP");
    expect(nameless.otherName).toBe("Spiral Nexus user");
  });

  it("shows a placeholder when the listing has been removed", async () => {
    const mock = mockInbox({ conversations: [conversation({ listing: null })] });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.listingTitle).toBe("Listing removed");
  });

  // Messages arrive newest-first, so the snippet is the FIRST row seen per
  // thread — not the last.
  it("uses the newest message as the snippet", async () => {
    const mock = mockInbox({
      conversations: [conversation()],
      messages: [
        msg({ body: "newest", created_at: "2026-08-08T10:00:00Z" }),
        msg({ body: "older", created_at: "2026-08-08T09:00:00Z" }),
      ],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.snippet).toEqual({ body: "newest", senderId: THEM });
  });

  it("has a null snippet for a thread with no messages", async () => {
    const mock = mockInbox({ conversations: [conversation()] });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.snippet).toBeNull();
    expect(row.unread).toBe(0);
  });

  it("counts every incoming message as unread when never read", async () => {
    const mock = mockInbox({
      conversations: [conversation()],
      messages: [
        msg({ created_at: "2026-08-08T10:00:00Z" }),
        msg({ created_at: "2026-08-08T09:00:00Z" }),
      ],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.unread).toBe(2);
  });

  it("never counts the viewer's own messages as unread", async () => {
    const mock = mockInbox({
      conversations: [conversation()],
      messages: [
        msg({ sender_id: ME, created_at: "2026-08-08T10:00:00Z" }),
        msg({ sender_id: ME, created_at: "2026-08-08T09:00:00Z" }),
      ],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.unread).toBe(0);
  });

  it("counts only messages after the read marker", async () => {
    const mock = mockInbox({
      conversations: [conversation()],
      messages: [
        msg({ created_at: "2026-08-08T11:00:00Z" }),
        msg({ created_at: "2026-08-08T10:00:00Z" }),
        msg({ created_at: "2026-08-08T08:00:00Z" }),
      ],
      reads: [{ conversation_id: "c1", last_read_at: "2026-08-08T09:00:00Z" }],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.unread).toBe(2);
  });

  it("reports zero unread once everything has been read", async () => {
    const mock = mockInbox({
      conversations: [conversation()],
      messages: [msg({ created_at: "2026-08-08T10:00:00Z" })],
      reads: [{ conversation_id: "c1", last_read_at: "2026-08-08T12:00:00Z" }],
    });
    const [row] = await loadInboxRows(mock.client, ME);

    expect(row.unread).toBe(0);
  });

  it("keeps snippets and unread counts scoped to their own thread", async () => {
    const mock = mockInbox({
      conversations: [conversation(), conversation({ id: "c2" })],
      messages: [
        msg({ conversation_id: "c1", body: "one" }),
        msg({ conversation_id: "c2", body: "two" }),
        msg({
          conversation_id: "c2",
          body: "three",
          created_at: "2026-08-08T09:00:00Z",
        }),
      ],
    });
    const rows = await loadInboxRows(mock.client, ME);

    expect(rows.find((r) => r.id === "c1")?.snippet?.body).toBe("one");
    expect(rows.find((r) => r.id === "c1")?.unread).toBe(1);
    expect(rows.find((r) => r.id === "c2")?.snippet?.body).toBe("two");
    expect(rows.find((r) => r.id === "c2")?.unread).toBe(2);
  });

  it("batches messages and read markers over all thread ids", async () => {
    const mock = mockInbox({
      conversations: [conversation(), conversation({ id: "c2" })],
    });
    await loadInboxRows(mock.client, ME);

    expect(mock.forTable("messages")[0].argsFor("in")).toEqual([
      "conversation_id",
      ["c1", "c2"],
    ]);
    expect(mock.forTable("conversation_reads")[0].argsFor("in")).toEqual([
      "conversation_id",
      ["c1", "c2"],
    ]);
  });
});
