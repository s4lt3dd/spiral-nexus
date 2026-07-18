// Presentational follower/following counts for the ProfileIdentity `stats` slot.
export function FollowStats({
  followers,
  following,
}: {
  followers: number;
  following: number;
}) {
  return (
    <>
      <span>
        <strong className="font-semibold text-foreground">{followers}</strong>{" "}
        {followers === 1 ? "follower" : "followers"}
      </span>
      <span>
        <strong className="font-semibold text-foreground">{following}</strong> following
      </span>
    </>
  );
}
