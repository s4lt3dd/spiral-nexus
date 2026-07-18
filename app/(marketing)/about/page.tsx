import Link from "next/link";
import { ArrowRight, ShieldCheck, Handshake, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { NexusMark } from "@/components/brand/nexus-mark";
import { Reveal } from "@/components/marketing/reveal";

export const metadata = { title: "About · Spiral Nexus" };

const principles = [
  {
    icon: Handshake,
    title: "Owners first",
    body: "You decide what to list, what to charge, and who to talk to. We make the connection — never the deal on your behalf.",
  },
  {
    icon: Sparkles,
    title: "Real introductions",
    body: "No vanity matches or noise. A result is a mark someone is ready to move, and a message reaches a real owner.",
  },
  {
    icon: ShieldCheck,
    title: "Credible by default",
    body: "User-submitted listings are kept distinct from registry data, so ownership is never implied where it isn't earned.",
  },
];

export default function AboutPage() {
  return (
    <main>
      {/* ---------------- Mission hero ---------------- */}
      <section className="relative isolate overflow-hidden bg-[image:var(--gradient-hero)] text-white">
        <div
          aria-hidden
          className="aurora-a pointer-events-none absolute -top-1/3 left-1/4 size-[55vw] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.45),transparent_60%)] blur-3xl mix-blend-screen"
        />
        <NexusMark className="pointer-events-none absolute top-1/2 -right-24 size-[34rem] -translate-y-1/2 text-white opacity-[0.06]" />

        <div className="animate-rise mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 uppercase backdrop-blur">
            Our mission
          </span>
          <h1 className="mt-6 text-4xl leading-[1.08] font-semibold text-balance text-white sm:text-6xl">
            Don&apos;t let intellectual property sit unused
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Most valuable IP never reaches the people who could put it to work.
            Spiral Nexus exists to close that gap.
          </p>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[var(--bg)]"
        />
      </section>

      {/* ---------------- Narrative ---------------- */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <Reveal>
          <span className="text-sm font-medium tracking-wide text-brand-text uppercase">
            The problem
          </span>
          <h2 className="mt-3 text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
            Opportunity shouldn&apos;t stay hidden
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-600">
            <p>
              Behind every unused trade mark is the potential for a new product,
              a new partnership or a new business.
            </p>
            <p>
              Yet discovering available intellectual property remains
              fragmented, time-consuming and reliant on existing networks.
            </p>
            <p>
              Our platform creates a central hub where intellectual property
              owners and businesses can discover opportunities, make meaningful
              connections and unlock value together.
            </p>
          </div>
        </Reveal>

        <Reveal className="mt-16">
          <span className="text-sm font-medium tracking-wide text-brand-text uppercase">
            What we do
          </span>
          <h2 className="mt-3 text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
            A direct, credible hub for IP
          </h2>
          <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-600">
            <p>
              Owners list the marks they&apos;re ready to license or sell.
              Buyers, investors, and brand partners search, discover, and reach
              out — directly. We protect one loop above all else: an owner
              lists an asset, a buyer finds it, and the two connect.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------------- Pull quote ---------------- */}
      <section className="px-6 pb-20 sm:pb-24">
        <Reveal className="mx-auto max-w-4xl">
          <figure className="relative overflow-hidden rounded-2xl border border-border bg-brand-tint/40 px-8 py-14 text-center sm:px-16">
            <NexusMark className="pointer-events-none absolute -top-10 -left-8 size-48 opacity-[0.08]" />
            <blockquote className="relative font-display text-2xl leading-snug font-medium text-foreground sm:text-3xl">
              Turn a dormant trademark into a licensing or sale opportunity —
              without the noise, the gatekeepers, or the guesswork.
            </blockquote>
          </figure>
        </Reveal>
      </section>

      {/* ---------------- Principles ---------------- */}
      <section
        aria-labelledby="principles-heading"
        className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24"
      >
        <Reveal className="max-w-2xl">
          <span className="text-sm font-medium tracking-wide text-brand-text uppercase">
            How we operate
          </span>
          <h2
            id="principles-heading"
            className="mt-3 text-3xl leading-tight font-semibold text-foreground sm:text-4xl"
          >
            The principles behind the platform
          </h2>
          <p className="mt-4 font-display text-xl font-medium text-brand-text">
            Efficiency. Community. Accessibility. Transparency.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {principles.map((p, i) => (
            <Reveal key={p.title} delay={i}>
              <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-6 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-md bg-brand-tint text-brand-text">
                  <p.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-medium text-foreground">
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {p.body}
                </p>
              </div>
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
              Join the hub for intellectual property
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
              Whether you hold IP or you&apos;re looking for it, your next move
              starts here.
            </p>
            <div className="mt-8">
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
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
