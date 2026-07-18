// AUTH-GATED route — /network (member directory) is sign-in-only, matching the
// invite-only pre-launch stance (see protectedPrefixes in
// lib/supabase/middleware.ts). Reopen to anon for SEO at Launch.

import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import {
  memberParamsSchema,
  searchMembers,
  type MemberParams,
} from "@/lib/members";
import { SiteHeader } from "@/components/marketing/site-header";
import { MemberFilters } from "@/components/network/member-filters";
import { MemberCard } from "@/components/network/member-card";
import { MembersPagination } from "@/components/network/members-pagination";

export const metadata = { title: "Connect · Spiral Nexus" };

type RawParams = Record<string, string | string[] | undefined>;

function firstValues(raw: RawParams) {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = Array.isArray(v) ? v[0] : v;
  return out;
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<RawParams>;
}) {
  const raw = firstValues(await searchParams);
  const parsed = memberParamsSchema.safeParse(raw);
  const params: MemberParams = parsed.success
    ? parsed.data
    : memberParamsSchema.parse({});

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { rows, count, pageCount } = await searchMembers(supabase, params, {
    excludeId: user.id,
  });

  // Which of THIS page's members the viewer already follows (one query, scoped
  // to the page — button-state only, no per-card counts).
  const memberIds = rows.map((m) => m.id);
  let followingIds = new Set<string>();
  if (memberIds.length > 0) {
    const { data: edges } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .in("following_id", memberIds);
    followingIds = new Set((edges ?? []).map((e) => e.following_id));
  }

  return (
    <div className="min-h-screen">
      <SiteHeader email={user.email} />

      <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <header className="max-w-2xl">
          <p className="text-sm font-medium tracking-wide text-brand-text uppercase">
            Connect
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
            Find members
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Discover owners, buyers, licensees, and investors across the network
            — and reach out through their profile.
          </p>
        </header>

        <div className="mt-8">
          <MemberFilters current={params} />
        </div>

        <p className="mt-6 text-sm text-slate-500" aria-live="polite">
          {count} {count === 1 ? "member" : "members"}
        </p>

        {rows.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-text">
              <Users className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 text-xl font-semibold text-foreground">
              No matching members
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Try a different search term or clear your filters to see everyone
              in the network.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                following={followingIds.has(member.id)}
              />
            ))}
          </div>
        )}

        <MembersPagination current={params} pageCount={pageCount} />
      </main>
    </div>
  );
}
