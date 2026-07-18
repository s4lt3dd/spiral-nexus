import Image from "next/image";
import { UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

type AvatarProfile = {
  id: string;
  display_name: string | null;
  org_name: string | null;
  avatar_url: string | null;
};

// Round avatar: the member's photo when set, otherwise a neutral person icon
// on a muted disc — the conventional "no photo" placeholder (founder ask:
// drop the coloured initials monograms). display_name/org_name stay on the
// type so callers are unchanged; only the photo drives what renders.
export function ProfileAvatar({
  profile,
  size = 64,
  className,
}: {
  profile: AvatarProfile;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };

  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt=""
        width={size}
        height={size}
        // User-supplied external URL — skip the optimizer until uploads move to
        // our own Storage (deferred to Launch).
        unoptimized
        className={cn("rounded-full object-cover ring-1 ring-border", className)}
        style={box}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full bg-surface-raised text-slate-400 ring-1 ring-border",
        className,
      )}
      style={box}
    >
      <UserRound
        strokeWidth={1.75}
        style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }}
        aria-hidden
      />
    </span>
  );
}
