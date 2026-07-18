import Link from "next/link";

import type { PublicProfile } from "@/lib/types";
import { profileDisplayName, roleLabel } from "@/lib/profile";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { FollowButton } from "@/components/profile/follow-button";

// Directory card, uniform height across the grid (founder ask: cards should be
// uniform like LinkedIn). The avatar fixes the header height, the headline
// reserves two lines, and roles/sectors each get one clipped row — so a sparse
// profile and a rich one occupy the same box. Profile-only, no per-card counts
// (avoids N+1). The follow toggle sits in the header, in-flow.
export function MemberCard({
  member,
  following,
}: {
  member: PublicProfile;
  following?: boolean;
}) {
  const name = profileDisplayName(member);
  const href = `/u/${member.id}`;
  const roles = member.role_flags.slice(0, 2);
  const rolesMore = member.role_flags.length - roles.length;
  const sectors = member.sectors.slice(0, 2);
  const sectorsMore = member.sectors.length - sectors.length;
  // Prefer the specific free-text location; fall back to country.
  const meta = [member.org_name, member.location || member.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-start gap-3">
        <Link
          href={href}
          className="shrink-0 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
        >
          <ProfileAvatar profile={member} size={56} className="size-14" />
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
          {/* Reserve the meta line so the name block is a stable height. */}
          <p className="mt-0.5 min-h-[1.25rem] truncate text-sm text-slate-500">
            {meta}
          </p>
        </div>

        {following !== undefined && (
          <FollowButton
            targetId={member.id}
            initialFollowing={following}
            iconOnly
          />
        )}
      </div>

      {/* Headline — reserved two lines so every card matches height. */}
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-slate-600">
        {member.headline}
      </p>

      {/* Roles + sectors — one clipped row each, pinned to the card bottom and
          always reserved so uneven tag counts don't change the card height. */}
      <div className="mt-auto space-y-2 pt-4">
        <div className="flex h-6 items-center gap-1.5 overflow-hidden">
          {roles.map((r) => (
            <Badge key={r} variant="brand">
              {roleLabel(r)}
            </Badge>
          ))}
          {rolesMore > 0 && <Badge variant="brand">+{rolesMore}</Badge>}
        </div>
        <div className="flex h-6 items-center gap-1.5 overflow-hidden">
          {sectors.map((s) => (
            <Badge key={s} variant="slate">
              {s}
            </Badge>
          ))}
          {sectorsMore > 0 && <Badge variant="slate">+{sectorsMore}</Badge>}
        </div>
      </div>
    </Card>
  );
}
