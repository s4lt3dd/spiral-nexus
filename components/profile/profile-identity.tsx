import { Globe, MapPin } from "lucide-react";

import type { PublicProfile } from "@/lib/types";

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.34 18.34v-7.2H6v7.2zM7.17 9.92a1.36 1.36 0 1 0 0-2.72 1.36 1.36 0 0 0 0 2.72M18.34 18.34v-3.95c0-2.11-.45-3.74-2.92-3.74-1.19 0-1.98.65-2.31 1.27h-.03v-1.08H10.9v7.2h2.34v-3.56c0-.94.18-1.85 1.34-1.85 1.15 0 1.16 1.07 1.16 1.91v3.5z" />
    </svg>
  );
}
import { roleLabel, niceClassLabel } from "@/lib/profile";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatar } from "@/components/profile/profile-avatar";

// Shared identity block for the profile home and the public /u/[id] page.
// Presentational + server-safe. `actions` renders buttons under the header
// (e.g. Edit profile on your own home).
export function ProfileIdentity({
  profile,
  actions,
  stats,
}: {
  profile: PublicProfile;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
}) {
  const name = profile.display_name?.trim() || profile.org_name?.trim() || "Member";
  const hasFocus =
    profile.sectors.length > 0 || profile.nice_class_interests.length > 0;

  return (
    <div className="animate-rise relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <ProfileAvatar
          profile={profile}
          size={96}
          className="shrink-0 size-20 text-2xl sm:size-24"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-3xl leading-[1.1] font-semibold tracking-[-0.02em] text-ink">
              {name}
            </h1>
            {profile.verified && (
              <Badge variant="gold" className="gap-1">
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

          {profile.headline && (
            <p className="mt-2 text-base text-slate-700">{profile.headline}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-500">
            {profile.org_name && (
              <span className="font-medium text-slate-600">
                {profile.org_name}
              </span>
            )}
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {profile.location}
              </span>
            )}
          </div>

          {profile.role_flags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.role_flags.map((r) => (
                <Badge key={r} variant="brand">
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>
          )}

          {(profile.website || profile.linkedin_url) && (
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  <Globe className="size-4" aria-hidden />
                  Website
                </a>
              )}
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                >
                  <LinkedInIcon className="size-4" />
                  LinkedIn
                </a>
              )}
            </div>
          )}

          {stats && (
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-600">
              {stats}
            </div>
          )}

          {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>

      {profile.bio && (
        <p className="mt-6 max-w-prose text-base leading-relaxed whitespace-pre-line text-slate-700">
          {profile.bio}
        </p>
      )}

      {(hasFocus || profile.jurisdictions.length > 0) && (
        <div className="mt-6 grid gap-5 border-t border-slate-100 pt-6 sm:grid-cols-2">
          {hasFocus && (
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Focus
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {profile.sectors.map((s) => (
                  <Badge key={s} variant="slate">
                    {s}
                  </Badge>
                ))}
                {profile.nice_class_interests.map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-slate-600 uppercase"
                    title={niceClassLabel(n)}
                  >
                    Nice {n}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.jurisdictions.length > 0 && (
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Jurisdictions
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {profile.jurisdictions.map((j) => (
                  <Badge key={j} variant="slate">
                    {j}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
