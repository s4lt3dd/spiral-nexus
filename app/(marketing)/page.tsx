import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn your intellectual property into opportunity
        </h1>
        <p className="text-lg text-neutral-600">
          Spiral Nexus is the marketplace to list, discover, and commercialise
          patents and trademarks — and connect with the right partners.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Join / Sign in
        </Link>
        <Link
          href="/subscriptions"
          className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
        >
          View plans
        </Link>
      </div>
    </main>
  );
}
