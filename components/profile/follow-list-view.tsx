import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

import type { PublicProfile } from "@/lib/types";
import { profileDisplayName } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { MemberCard } from "@/components/network/member-card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";

type Tab = "followers" | "following";

// Shared body for /u/[id]/followers and /u/[id]/following: a back link to the
// profile, the member's identity, the Followers|Following tab switch, and the
// hydrated member grid (reusing the directory card + its follow toggle).
export function FollowListView({
  profile,
  tab,
  members,
  followingIds,
  counts,
  viewerId,
}: {
  profile: PublicProfile;
  tab: Tab;
  members: PublicProfile[];
  followingIds: Set<string>;
  counts: { followers: number; following: number };
  viewerId: string;
}) {
  const name = profileDisplayName(profile);
  const base = `/u/${profile.id}`;
  const isSelf = profile.id === viewerId;
  const tabs = [
    { key: "followers" as const, label: "Followers", count: counts.followers },
    { key: "following" as const, label: "Following", count: counts.following },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:py-14">
      <Link
        href={base}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-slate-500 transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to profile
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ProfileAvatar profile={profile} size={48} className="size-12" />
        <h1 className="font-display text-2xl leading-tight font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">
          {name}
        </h1>
      </div>

      {/* Tab switch — plain links so each list is its own shareable URL. */}
      <div className="mt-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`${base}/${t.key}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25",
              t.key === tab
                ? "border-brand text-foreground"
                : "border-transparent text-slate-500 hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                t.key === tab
                  ? "bg-brand-tint text-brand-text"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {members.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-surface px-8 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand-text">
            <Users className="size-6" aria-hidden />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-foreground">
            {tab === "followers" ? "No followers yet" : "Not following anyone yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-slate-600">
            {emptyBody(tab, isSelf, name)}
          </p>
          {isSelf && tab === "following" && (
            <Link
              href="/network"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-text hover:underline"
            >
              <Users className="size-4" aria-hidden />
              Find members to follow
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              // No follow toggle on the viewer's own card.
              following={
                member.id === viewerId ? undefined : followingIds.has(member.id)
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}

function emptyBody(tab: Tab, isSelf: boolean, name: string): string {
  if (tab === "followers") {
    return isSelf
      ? "When members follow you, they'll show up here."
      : `${name} doesn't have any followers yet.`;
  }
  return isSelf
    ? "Follow owners, buyers and licensees to keep track of them here."
    : `${name} isn't following anyone yet.`;
}
