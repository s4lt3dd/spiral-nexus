import Image from "next/image";

import { cn } from "@/lib/utils";
import { profileInitials } from "@/lib/profile";

// Deterministic brand-gradient set for the monogram fallback (purple/indigo
// family per design-system MASTER). Picked by a stable hash of the user id so a
// given member always gets the same colours.
const GRADIENTS = [
  "linear-gradient(135deg,#7C3AED,#4F46E5)",
  "linear-gradient(135deg,#6D28D9,#4338CA)",
  "linear-gradient(135deg,#5B21B6,#312E81)",
  "linear-gradient(135deg,#7E22CE,#4F46E5)",
  "linear-gradient(135deg,#6D28D9,#9333EA)",
];

function hashIndex(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

type AvatarProfile = {
  id: string;
  display_name: string | null;
  org_name: string | null;
  avatar_url: string | null;
};

// Round avatar: the user's photo if set, else an on-brand gradient monogram.
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
        className={cn(
          "rounded-full object-cover ring-1 ring-slate-200/70",
          className,
        )}
        style={box}
      />
    );
  }

  const grad = GRADIENTS[hashIndex(profile.id, GRADIENTS.length)];
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full font-display font-medium text-white shadow-sm",
        className,
      )}
      style={{ ...box, backgroundImage: grad, fontSize: Math.round(size * 0.38) }}
    >
      {profileInitials(profile)}
    </span>
  );
}
