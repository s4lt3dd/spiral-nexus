import Link from "next/link";
import { Check } from "lucide-react";

import { TIERS, type Tier } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Plans · Spiral Nexus" };

const ORDER: Tier[] = ["entry", "professional", "brand_partner", "enterprise"];
const POPULAR: Tier = "professional";

function features(tier: (typeof TIERS)[Tier]): string[] {
  const list: string[] = [];
  list.push(
    tier.maxListings === null
      ? "Unlimited listings"
      : tier.maxListings === 0
        ? "Browse listings"
        : `List up to ${tier.maxListings} assets`,
  );
  list.push(
    tier.weeklyDmLimit === null
      ? "Unlimited messages"
      : tier.weeklyDmLimit === 0
        ? "Browse only"
        : `${tier.weeklyDmLimit} messages / week`,
  );
  if (tier.canGetVerifiedBadge) list.push("Verified badge");
  if (tier.canSeeSellerAnalytics) list.push("Seller analytics");
  if (tier.fullMatchmaking) list.push("Full AI matchmaking");
  return list;
}

export default function SubscriptionsPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="max-w-2xl">
        <span className="text-sm font-medium tracking-wide text-brand uppercase">
          Plans
        </span>
        <h1 className="mt-3 text-4xl leading-[1.1] font-semibold text-ink">
          Pricing that fits every stage
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Start free while you build your portfolio. Upgrade when you&apos;re
          ready to reach more partners.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((t) => {
          const tier = TIERS[t];
          const isPopular = t === POPULAR;
          const isEnterprise = t === "enterprise";
          return (
            <div
              key={t}
              className={cn(
                "relative flex flex-col rounded-lg border bg-surface p-6 shadow-sm",
                isPopular ? "border-brand ring-1 ring-brand" : "border-border",
              )}
            >
              {isPopular && (
                <Badge variant="brand" className="absolute -top-3 left-6">
                  Most popular
                </Badge>
              )}
              <h2
                className={cn(
                  "font-display text-xl font-medium",
                  isEnterprise ? "text-gold" : "text-ink",
                )}
              >
                {tier.label}
              </h2>
              <p className="mt-3 text-3xl font-semibold text-ink">
                £{tier.pricePerMonth}
                <span className="text-base font-normal text-slate-500">
                  {" "}
                  / mo
                </span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-600">
                {features(tier).map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        isEnterprise ? "text-gold" : "text-brand",
                      )}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={cn(
                  buttonVariants({
                    variant: isPopular ? "default" : "outline",
                  }),
                  "mt-6 w-full",
                )}
              >
                {tier.pricePerMonth === 0 ? "Get started" : "Choose plan"}
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}
