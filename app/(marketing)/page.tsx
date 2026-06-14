import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NexusMark } from "@/components/brand/nexus-mark";
import { Reveal } from "@/components/marketing/reveal";
import { NexusConstellation } from "@/components/marketing/nexus-constellation";
import { CountUp } from "@/components/marketing/count-up";
import { VerifiedAvatar } from "@/components/marketing/verified-avatar";

const stats = [
  { value: 1200, suffix: "+", label: "Trademarks listed" },
  { value: 48, label: "Jurisdictions" },
  { value: 3500, suffix: "+", label: "Introductions made" },
  { value: 40, prefix: "£", suffix: "M+", label: "In listed value" },
];

const testimonials = [
  {
    quote:
      "Spiral Nexus turned a dormant mark into a signed licensing deal in three weeks.",
    name: "Ava Okafor",
    role: "Founder, Northwind Brands",
    initials: "AO",
  },
  {
    quote:
      "We found a trademark that fit our new product line perfectly — and reached the owner the same day.",
    name: "Ben Reyes",
    role: "Brand Partner, Halden & Co",
    initials: "BR",
  },
  {
    quote:
      "Finally, a credible place to list IP without the noise. The introductions are real.",
    name: "Mara Lind",
    role: "IP Counsel, Lind Legal",
    initials: "ML",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ---------------- Hero ---------------- */}
      <section className="relative isolate overflow-hidden bg-[image:var(--gradient-hero)] text-white">
        <div
          aria-hidden
          className="aurora-a pointer-events-none absolute -top-1/3 -left-1/4 size-[70vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.5),transparent_60%)] blur-3xl mix-blend-screen"
        />
        <div
          aria-hidden
          className="aurora-b pointer-events-none absolute -right-1/4 -bottom-1/3 size-[65vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.45),transparent_60%)] blur-3xl mix-blend-screen"
        />
        <NexusMark className="pointer-events-none absolute top-1/2 left-1/2 size-[40rem] -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.05]" />

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:py-28 lg:grid-cols-2 lg:gap-8">
          <div className="animate-rise relative z-10 max-w-xl">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 uppercase backdrop-blur">
              The IP marketplace
            </span>
            <h1 className="mt-6 text-5xl leading-[1.04] font-semibold text-balance text-white sm:text-6xl lg:text-7xl">
              Where dormant IP finds its next owner
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/75">
              Spiral Nexus is the marketplace to list, discover, and
              commercialise trademarks — and connect directly with the partners
              who want them.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-ink shadow-lg hover:bg-white/90",
                )}
              >
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                )}
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="relative h-[360px] sm:h-[440px] lg:h-[560px]">
            <NexusConstellation className="absolute inset-0" />
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg)]"
        />
      </section>

      {/* ---------------- How it works ---------------- */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="mx-auto max-w-6xl px-6 py-20 sm:py-28"
      >
        <Reveal className="max-w-2xl">
          <span className="text-sm font-medium tracking-wide text-brand uppercase">
            How it works
          </span>
          <h2
            id="how-heading"
            className="mt-3 text-3xl leading-tight font-semibold text-ink sm:text-4xl"
          >
            From listing to introduction, in three moves
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            No data feeds, no middlemen. Owners publish the marks they&apos;re
            ready to move; buyers find them and reach out.
          </p>
        </Reveal>

        <div className="mt-12 space-y-6">
          {/* 01 — List */}
          <Reveal>
            <div className="grid items-center gap-8 rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-10 lg:grid-cols-2">
              <div className="min-w-0">
                <span className="font-display text-sm font-medium text-brand">
                  01
                </span>
                <h3 className="mt-2 font-display text-2xl font-medium text-ink">
                  List your trademark
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Add the mark, its class and jurisdiction, and how you want to
                  deal — licence, sale, or both. Keep it a draft until it&apos;s
                  ready, then publish.
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-bg p-4 shadow-md sm:p-5">
                <div className="flex gap-4">
                  <div className="flex aspect-[16/10] w-20 shrink-0 items-center justify-center rounded-md bg-slate-100 ring-1 ring-slate-200/70 sm:w-28">
                    <NexusMark className="size-8 opacity-25 sm:size-9" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-display text-base font-medium text-ink">
                        NIMBUS
                      </h4>
                      <Badge variant="brand">Published</Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      Cloud storage word mark
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-slate-500">
                      <Badge variant="brand">Registered</Badge>
                      <span>United Kingdom</span>
                      <span className="inline-flex items-center rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.7rem] font-medium tracking-wide text-slate-600 uppercase">
                        Nice 9
                      </span>
                      <span className="ml-auto font-semibold text-ink">
                        £24,000
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* 02 — Discover */}
          <Reveal>
            <div className="grid items-center gap-8 rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-10 lg:grid-cols-2">
              <div className="order-1 min-w-0 lg:order-2">
                <span className="font-display text-sm font-medium text-brand">
                  02
                </span>
                <h3 className="mt-2 font-display text-2xl font-medium text-ink">
                  Discover the right mark
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Search and filter by class, jurisdiction, and deal type.
                  Published listings only — every result is a mark someone is
                  ready to move.
                </p>
              </div>
              <div className="order-2 min-w-0 rounded-lg border border-border bg-bg p-4 shadow-md sm:p-5 lg:order-1">
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                  <Search className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate text-sm text-slate-500">
                    skincare · class 3 · United Kingdom
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["NICE 3", "United Kingdom", "Licence"].map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-brand"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {[
                    { t: "VERDANT", d: "Organic skincare · NICE 3", p: "£38,000" },
                    { t: "AURELIA", d: "Cosmetics · NICE 3", p: "£12,500" },
                  ].map((r) => (
                    <div
                      key={r.t}
                      className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded bg-slate-100">
                        <NexusMark className="size-4 opacity-30" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">
                          {r.t}
                        </p>
                        <p className="truncate text-xs text-slate-500">{r.d}</p>
                      </div>
                      <span className="text-xs font-semibold text-ink">
                        {r.p}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* 03 — Connect */}
          <Reveal>
            <div className="grid items-center gap-8 rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-10 lg:grid-cols-2">
              <div className="min-w-0">
                <span className="font-display text-sm font-medium text-brand">
                  03
                </span>
                <h3 className="mt-2 font-display text-2xl font-medium text-ink">
                  Connect directly
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">
                  Interested buyers message you on the platform. You stay in
                  control of every conversation — and every deal.
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-bg p-4 shadow-md sm:p-5">
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <VerifiedAvatar initials="AO" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      Ava Okafor
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Owner · Northwind Brands
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    Is NIMBUS still available to licence?
                  </div>
                  <div className="ml-auto max-w-[80%] rounded-lg rounded-tr-sm bg-brand px-3 py-2 text-sm text-white">
                    It is — happy to walk you through terms this week.
                  </div>
                </div>
                <div className="mt-3 rounded-md border border-border bg-surface px-3 py-2 text-sm text-slate-400">
                  Write a message…
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- Stats band ---------------- */}
      <section className="relative overflow-hidden bg-[image:var(--gradient-hero)] text-white">
        <NexusMark className="pointer-events-none absolute -top-20 -right-16 size-80 text-white opacity-[0.06]" />
        <Reveal className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dd className="font-display text-4xl font-semibold text-white sm:text-5xl">
                  <CountUp
                    value={s.value}
                    prefix={s.prefix}
                    suffix={s.suffix}
                  />
                </dd>
                <dt className="mt-2 text-sm text-white/70">{s.label}</dt>
              </div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* ---------------- Testimonials ---------------- */}
      <section
        aria-labelledby="loved-heading"
        className="mx-auto max-w-6xl px-6 py-20 sm:py-28"
      >
        <Reveal className="max-w-2xl">
          <span className="text-sm font-medium tracking-wide text-brand uppercase">
            Trusted by both sides
          </span>
          <h2
            id="loved-heading"
            className="mt-3 text-3xl leading-tight font-semibold text-ink sm:text-4xl"
          >
            Owners and partners, meeting in the middle
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.name} delay={i}>
              <figure className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-sm">
                <blockquote className="flex-1 font-display text-lg leading-relaxed text-ink">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <VerifiedAvatar initials={t.initials} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {t.name}
                    </p>
                    <p className="truncate text-sm text-slate-500">{t.role}</p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-2xl bg-[image:var(--gradient-hero)] px-8 py-16 text-center text-white sm:px-16 sm:py-20">
            <NexusMark className="pointer-events-none absolute -top-16 -right-10 size-72 text-white opacity-[0.07]" />
            <h2 className="mx-auto max-w-2xl text-3xl leading-tight font-semibold text-white sm:text-4xl">
              Put your intellectual property to work
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
              List a trademark in minutes, or start discovering the marks that
              fit your next move.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "bg-white text-ink shadow-lg hover:bg-white/90",
                )}
              >
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/subscriptions"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white",
                )}
              >
                View plans
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
