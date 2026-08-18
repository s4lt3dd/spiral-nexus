import Link from "next/link";

// Follower/following counts for the ProfileIdentity `stats` slot — each links
// to the corresponding list (/u/[id]/followers · /following) so members can see
// who's following who.
export function FollowStats({
  profileId,
  followers,
  following,
}: {
  profileId: string;
  followers: number;
  following: number;
}) {
  const base = `/u/${profileId}`;
  return (
    <>
      <Link
        href={`${base}/followers`}
        className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
      >
        <strong className="font-semibold text-foreground">{followers}</strong>{" "}
        {followers === 1 ? "follower" : "followers"}
      </Link>
      <Link
        href={`${base}/following`}
        className="rounded-sm transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-brand/25"
      >
        <strong className="font-semibold text-foreground">{following}</strong>{" "}
        following
      </Link>
    </>
  );
}
