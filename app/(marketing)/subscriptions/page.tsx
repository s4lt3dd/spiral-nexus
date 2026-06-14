import { TIERS, type Tier } from "@/lib/tiers";

const ORDER: Tier[] = ["entry", "professional", "brand_partner", "enterprise"];

export default function SubscriptionsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-3xl font-semibold">Pricing that fits every stage</h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((t) => {
          const tier = TIERS[t];
          return (
            <div key={t} className="rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-medium">{tier.label}</h2>
              <p className="mt-2 text-2xl font-semibold">
                £{tier.pricePerMonth}
                <span className="text-sm font-normal text-neutral-500">
                  {" "}
                  / month
                </span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-neutral-600">
                <li>
                  Listings:{" "}
                  {tier.maxListings === null
                    ? "Unlimited"
                    : tier.maxListings === 0
                      ? "Browse only"
                      : tier.maxListings}
                </li>
                <li>
                  Weekly DMs:{" "}
                  {tier.weeklyDmLimit === null
                    ? "Unlimited"
                    : tier.weeklyDmLimit}
                </li>
                {tier.canGetVerifiedBadge && <li>Verified badge</li>}
                {tier.canSeeSellerAnalytics && <li>Seller analytics</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </main>
  );
}
