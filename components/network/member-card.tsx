import Link from "next/link";

import { cn } from "@/lib/utils";
import type { PublicProfile } from "@/lib/types";
import { profileDisplayName, roleLabel } from "@/lib/profile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FollowButton } from "@/components/profile/follow-button";

// Clickable directory card → the member's public profile. Profile-only (no
// listings count). `following` is optional: when provided, a follow toggle is
// overlaid as a sibling of the Link (not nested — avoids invalid HTML +
// swallowed navigation). Carries button-state only — no per-card counts (N+1).
export function MemberCard({
  member,
  following,
}: {
  member: PublicProfile;
  following?: boolean;
}) {
  const name = profileDisplayName(member);
  const sectorsShown = member.sectors.slice(0, 3);
  const sectorsMore = member.sectors.length - sectorsShown.length;

  const card = (
    <Link
      href={`/u/${member.id}`}
      className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
    >
      <Card className="h-full gap-0 p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-brand/30 group-hover:shadow-md">
        <div
          className={cn(
            "flex items-start gap-4",
            // Reserve room for the overlaid follow button (top-right).
            following !== undefined && "pr-24",
          )}
        >
          <ProfileAvatar profile={member} size={56} className="size-14 shrink-0 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-display text-lg leading-tight font-medium text-foreground">
                {name}
              </h3>
              {member.verified && (
                <Badge variant="gold" className="shrink-0 gap-1">
                  <svg viewBox="0 0 24 24" className="size-3" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
                    />
                  </svg>
                  Verified
                </Badge>
              )}
            </div>
            {(member.org_name || member.location) && (
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {[member.org_name, member.location].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {member.headline && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">
            {member.headline}
          </p>
        )}

        {member.role_flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {member.role_flags.map((r) => (
              <Badge key={r} variant="brand">
                {roleLabel(r)}
              </Badge>
            ))}
          </div>
        )}

        {sectorsShown.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sectorsShown.map((s) => (
              <Badge key={s} variant="slate">
                {s}
              </Badge>
            ))}
            {sectorsMore > 0 && (
              <Badge variant="slate">+{sectorsMore}</Badge>
            )}
          </div>
        )}
      </Card>
    </Link>
  );

  if (following === undefined) return card;

  return (
    <div className="relative">
      {card}
      <FollowButton
        targetId={member.id}
        initialFollowing={following}
        size="sm"
        className="absolute top-4 right-4 z-10"
      />
    </div>
  );
}
