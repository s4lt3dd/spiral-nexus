import { AlertTriangle } from "lucide-react";

// Shared long-form shell for legal pages. Carries the "draft" banner and the
// prose styling (no typography plugin — styled via descendant utilities) so
// /privacy and /terms read consistently and on-brand.
const prose =
  "mt-8 [&_h2]:mt-9 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink " +
  "[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:text-slate-700 " +
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_li]:text-slate-700 " +
  "[&_a]:font-medium [&_a]:text-brand [&_a]:underline [&_strong]:font-semibold [&_strong]:text-ink";

export function LegalArticle({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="flex items-start gap-3 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold-tint)] px-4 py-3 text-sm text-warning">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong>Draft — pending legal review.</strong> This is a scaffold to be
          reviewed and finalised by qualified counsel before launch. It is not
          legal advice.
        </p>
      </div>

      <h1 className="mt-8 font-display text-4xl leading-[1.1] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: {lastUpdated}</p>

      <div className={prose}>{children}</div>
    </main>
  );
}
