import Link from "next/link";

import type { PublicProfile } from "@/lib/types";
import { profileDisplayName, roleLabel } from "@/lib/profile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FollowButton } from "@/components/profile/follow-button";

// Directory card. The avatar + name link to the member's public profile; an
// optional compact follow toggle sits in the header (in-flow, not overlaid, so
// it never crowds the text or overflows on mobile). `following` is omitted in
// non-directory contexts. Profile-only — no per-card counts (avoids N+1).
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
  const href = `/u/${member.id}`;

  return (
    <Card className="h-full gap-0 p-5">
      <div className="flex items-start gap-3">
        <Link
          href={href}
          className="shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
        >
          <ProfileAvatar profile={member} size={56} className="size-14 text-lg" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={href}
              className="min-w-0 truncate rounded-sm font-display text-lg leading-tight font-medium text-foreground outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-brand/25"
            >
              {name}
            </Link>
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
          {(member.org_name || member.location || member.country) && (
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {/* Prefer the specific free-text location; fall back to country. */}
              {[member.org_name, member.location || member.country]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>

        {following !== undefined && (
          <FollowButton
            targetId={member.id}
            initialFollowing={following}
            iconOnly
          />
        )}
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
          {sectorsMore > 0 && <Badge variant="slate">+{sectorsMore}</Badge>}
        </div>
      )}
    </Card>
  );
}
