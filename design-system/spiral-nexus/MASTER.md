# Spiral Nexus — Design System (MASTER)

> **LOGIC:** When building a specific page, first check
> `design-system/spiral-nexus/pages/[page-name].md`. If it exists, its rules
> **override** this file. Otherwise follow everything below.

**Project:** Spiral Nexus — IP asset marketplace (B2B, legal/commercial)
**Art direction:** Premium & authoritative (Stripe/Linear-grade). Confident,
trustworthy, crafted. NOT sparse, NOT generic SaaS-blue, NOT AI-slop.

## The intent (read first)

The product was "tidy but boring." That happens when restraint has no point of
view. The cure is **intentional richness**: a real identity, deliberate depth,
expressive type, signature components, and motion. Most of the canvas stays calm
and neutral — then the brand colour, a confident headline, or a hover lift does
the talking. Premium = mostly neutral surfaces + one disciplined accent + craft
in the details (shadows, spacing rhythm, transitions, empty states).

---

## Colour

A neutral slate backbone carries ~90% of every screen. Emerald is the single
brand/action colour. Gold appears only for premium/verified moments. Never more
than two accent colours visible on one screen.

| Role | Hex | Token | Use |
|------|-----|-------|-----|
| Ink (primary text, dark surfaces, footer) | `#0B1220` | `--ink` | Headlines, top nav on dark, footer |
| Brand / Primary action (Purple) | `#6D28D9` | `--brand` | Primary buttons, active states, key accents |
| Brand hover | `#5B21B6` | `--brand-hover` | Hover/pressed |
| Brand tint (subtle bg) | `#EDE9FE` | `--brand-tint` | Selected rows, badges, soft fills |
| Brand gradient | `linear-gradient(135deg,#7C3AED,#6D28D9,#4F46E5)` | `--gradient-brand` | Primary buttons, signature medallions |
| Hero gradient (dark) | `linear-gradient(165deg,#1B1140,#2C1A57,#5B3F86)` | `--gradient-hero` | Marketing hero background |
| Gold (premium / verified — sparing) | `#9A7B22` | `--gold` | Verified badge, premium/enterprise marks only |
| Gold tint | `#F7F1DF` | `--gold-tint` | Verified pill background |
| Background (app canvas) | `#FBFCFD` | `--bg` | Page background (warmer than pure white) |
| Surface | `#FFFFFF` | `--surface` | Cards, sheets, inputs |
| Slate 50/100/200 | `#F8FAFC` / `#F1F5F9` / `#E2E8F0` | `--slate-50/100/200` | Subtle fills, dividers, borders |
| Slate 400/500/600 | `#94A3B8` / `#64748B` / `#475569` | `--slate-400/500/600` | Muted text, icons, secondary |
| Slate 800/900 | `#1E293B` / `#0F172A` | `--slate-800/900` | Strong text |
| Success | `#15803D` | `--success` | Published, positive |
| Warning | `#B45309` | `--warning` | Pending, attention |
| Danger | `#B91C1C` | `--danger` | Destructive, expired/errors |
| Info / link | `#2563EB` | `--info` | Inline links (sparing) |

**Status pills (trademark domain):** Draft → slate, Published → brand purple,
Registered → brand purple, Pending → amber/warning, Expired → muted slate/danger.

> **Founder decision (overrides the original emerald art direction):** the
> brand is **purple with gradients**, matching the Softr mockup. Emerald is no
> longer used. Purple gradients are the signature, not an anti-pattern.

**Do:** body text in `--slate-800` on `--bg` (never pure `#000` on `#fff`);
borders in `--slate-200`; brand purple reserved for actions and a few signals;
the dark hero gradient as a deliberate backdrop.
**Don't:** rainbow status colours, more than 2 accents per screen, flat/cheap
gradients, emoji headings.

---

## Typography

A serif display + grotesque body. The serif is what gives premium editorial
authority and kills the "generic SaaS" feeling; the sans keeps the UI crisp.

- **Display / Headings:** **Fraunces** (serif), weights 400/500/600, optical
  sizing on. Use for h1–h3, hero, section titles, listing titles.
- **Body / UI:** **Inter**, weights 400/500/600/700. Everything else, including
  data like registration numbers and prices (no monospace — founder decision).

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
```

**Scale (rem):** display `3.5` · h1 `2.25` · h2 `1.75` · h3 `1.375` ·
body-lg `1.125` · body `1` · sm `0.875` · xs `0.75`.
Display/h1/h2 use Fraunces with tracking `-0.02em` and line-height `1.05–1.15`.
Body line-height `1.6`. Headlines should feel **confident and large** — give
hero/h1 real size and weight; this is a primary lever against "bare".

---

## Spacing, radius, elevation

**Spacing (4px base):** `--space-1..` = 4, 8, 12, 16, 24, 32, 48, 64, 96.
Use a consistent rhythm; sections breathe at 48–96, components at 16–24.

**Radius:** `--radius-sm 6px` · `md 10px` · `lg 14px` · `xl 20px` · `full`.
Cards/inputs use `md`–`lg`. Don't pill everything; restraint reads premium.

**Shadows (soft, layered — the premium tell):**
```css
--shadow-xs: 0 1px 2px rgba(11,18,32,.06);
--shadow-sm: 0 1px 3px rgba(11,18,32,.08), 0 1px 2px rgba(11,18,32,.04);
--shadow-md: 0 4px 12px -2px rgba(11,18,32,.10), 0 2px 6px -2px rgba(11,18,32,.06);
--shadow-lg: 0 12px 28px -8px rgba(11,18,32,.16);
--focus-ring: 0 0 0 3px rgba(109,40,217,.25);   /* brand purple */
```
Use real elevation to separate layers (cards lift off `--bg`); avoid flat,
borderless, shadowless blocks — that's the boring look.

---

## Motion

- Durations: 150ms (hover/color), 200ms (default), 300ms (enter/reveal).
- Easing: `cubic-bezier(.2,.8,.2,1)` (confident ease-out).
- Interactive lift: cards/buttons `translateY(-1px..-2px)` + shadow step-up on
  hover. Inputs/buttons transition `background, box-shadow, transform`.
- Page/section content may fade-and-rise 8–12px on first paint.
- **Always** wrap non-essential motion in `@media (prefers-reduced-motion: reduce)`.

---

## Signature elements (make it unmistakably Spiral Nexus)

- **Nexus motif:** a faint concentric-ring / spiral mark (echoes the brand).
  Use as a low-opacity background flourish in the hero and empty states, and as
  the accent ring around verified owner avatars. Subtle, never loud.
- **Verified badge:** gold pill with a check — the only routine use of gold.
- **Rich empty states:** icon or spiral motif + one-line value statement +
  primary CTA. Never a lone grey sentence.
- **Data chips:** Nice class shown as a small labelled chip (e.g. `NICE 9`).

> **Removed (founder decision):** the 2px brand accent-edge on cards (do NOT
> re-add it) and the monospace treatment for data.

---

## Component specs

**Buttons**
- Primary: solid `--brand` bg, white text, `--radius-md`, weight 600,
  `--shadow-xs`; hover `--brand-hover` + lift + `--shadow-sm`; focus
  `--focus-ring`. Buttons are the interactive elements that lift on hover.
  (Gradients are reserved for the hero background and signature medallions, not
  buttons.)
- Secondary: `--surface` bg, `--slate-200` border, `--slate-800` text; hover
  `--slate-50`.
- Ghost: transparent, `--slate-600` text, hover `--slate-100`.
- Destructive: `--danger` text/border, hover danger-tint fill.
- Min height 40px (44px on touch); `cursor-pointer`; visible focus always.

**Cards (listing/asset)**
- `--surface`, `--radius-lg`, `1px --slate-200` border, `--shadow-sm`. **No
  card-level hover effect** (founder decision) — only the buttons/controls
  inside a card respond to hover.
- Structure: mark/image block (16:10, slate-100 placeholder if none) → title
  (Fraunces) → meta row (jurisdiction · `NICE n` chip) → status pill + price
  (mono). Generous internal padding (20–24px).

**Inputs**
- `--surface`, `1px --slate-300` border, `--radius-md`, 40px+; focus → brand
  border + `--focus-ring`. Labels in `--slate-700`, 500. Helper/error text
  small; errors in `--danger`.

**Status pill** — small, `--radius-full`, tinted bg + matching text per status
mapping above; 500 weight; uppercase tracking optional.

**Top nav** — `--surface` with bottom `--slate-200` border (or `--ink` on
marketing), brand wordmark in Fraunces, quiet links, primary CTA button.

**Table** (later slices) — `--slate-50` header, `--slate-200` row dividers, row
hover `--slate-50`, never zebra-stripe heavily; keep airy.

**Dialog / Toast** — `--surface`, `--radius-lg`, `--shadow-lg`; toast via Sonner.

---

## Implementation notes

- Define every token above as a CSS custom property in `app/globals.css` and
  expose through Tailwind v4 `@theme` + the shadcn CSS-variable theme
  (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, …) so
  utilities and shadcn components read the same source.
- Load fonts via `next/font` (Fraunces, Inter) for performance; map to
  `--font-display`, `--font-sans`.
- shadcn primitives stay the base; restyle via tokens — don't ship default
  shadcn look.

## Anti-patterns (the "boring/slop" failure modes to avoid)

- Flat, borderless, shadowless cards floating on white → no depth.
- One safe sans everywhere, timid type sizes → no hierarchy or character.
- Brand colour barely used / everything grey → sterile.
- Lone grey-text empty states, no CTA, no motif → lifeless.
- Default shadcn components with no token theming → generic.
- Emoji headings, centered single-column everything, flat/cheap gradients →
  AI-slop. (The brand purple gradient is deliberate and on-brand — not slop.)
