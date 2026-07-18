# Spiral Nexus — Design System (MASTER)

> **LOGIC:** When building a specific page, first check
> `design-system/spiral-nexus/pages/[page-name].md`. If it exists, its rules
> **override** this file. Otherwise follow everything below.

**Project:** Spiral Nexus — IP asset hub (B2B, legal/commercial)
**Art direction:** Premium, authoritative, **dark**. A deep purple-cast night
canvas with confident type and disciplined violet accents — "futuristic look
with traditional details" (founder brief). NOT sparse, NOT generic SaaS-blue,
NOT AI-slop, NOT neon-cyberpunk.

## Founder direction (July 2026 — authoritative)

From the founders' UI mood board (13-page PDF, July 2026) and follow-up
decisions. These override anything below that appears to conflict:

1. **Dark mode is THE theme.** The entire product — marketing and app — ships
   dark. There is no light mode for now. Do not build screens on light
   backgrounds; do not add a theme toggle without a founder decision.
2. **Clean & well organised** — generous spacing, clear hierarchy, no clutter.
3. **Diagrams and graphs** — convey data visually wherever it earns its place
   (dashboard stat cards with sparklines, distribution charts, activity
   meters). Numbers get confident display treatment.
4. **Futuristic look with traditional details** — the dark/violet/glow canvas
   is the futuristic half; the Fraunces serif display and calm editorial
   layout are the traditional half. Keep both in tension.
5. **Social-media-like ease of navigation** — familiar patterns (feed-style
   activity, cards, filters that behave like consumer apps). This is about
   *navigation familiarity*, not building a social feed (the feed itself is
   post-MVP per CLAUDE.md).

## Brand assets (logo)

Official lockup: woven-slat mark + "SPIRAL NEXUS" wordmark. Logo brand purple
is **`#551D67`** (deep plum — sampled from the supplied files). Files live in
`public/brand/`:

| File | Use |
|------|-----|
| `spiral-nexus-white.png` | Full stacked lockup, white — hero/footer moments on dark |
| `spiral-nexus-mark-white.png` | Mark only, white — **header/nav**, favicons, avatars, loading states |
| `spiral-nexus-purple.png` / `spiral-nexus-mark-purple.png` | Plum versions — light contexts only (emails, print, LOI/legal docs) |
| `spiral-nexus-og.jpg` | White-on-plum social/OG image |

**Usage rules:** in-app, use the white mark + the existing Fraunces text
wordmark side-by-side in the header (the stacked lockup is too tall for nav).
Never recolour the mark; never place the plum mark on the dark canvas (fails
contrast). The mark at low opacity (3–6%) is the approved background flourish
(see Signature elements).

---

## Colour

A deep purple-cast night canvas carries ~90% of every screen. Violet is the
single action colour; the logo plum anchors gradients. Gold appears only for
premium/verified moments. Never more than two accent colours visible at once.

| Role | Value | Token | Use |
|------|-------|-------|-----|
| Canvas (page bg) | `#0D0B14` | `--bg` | Page background — near-black with a purple cast, never pure `#000` |
| Surface (cards, inputs) | `#262338` | `--surface` | Cards, sheets, inputs, nav — lifted ≈1.26:1 off the canvas so it reads as elevated, not painted-on |
| Surface raised | `#302B44` | `--surface-raised` | Popovers, dialogs, hovered rows, stacked panels |
| Border | `#383350` | `--border` | Card/input borders, dividers — lifted to stay visible on the raised surface |
| Border strong | `#4A4468` | `--border-strong` | Focused input borders, table header rules |
| Text primary | `#F2EFFA` | `--text` | Headlines, body |
| Text secondary | `#B3ACC9` | `--text-secondary` | Supporting copy, labels |
| Text muted | `#9A93B4` | `--text-muted` | Meta, placeholders, timestamps (AA ≥4.5 even on the raised surface) |
| Brand deep (logo plum) | `#551D67` | `--brand-deep` | Gradient anchor, hero washes — never as text |
| Brand / primary action | `#7C3AED` | `--brand` | Primary buttons, active states, selected controls |
| Brand hover | `#8B5CF6` | `--brand-hover` | Hover/pressed |
| Brand text / links | `#A78BFA` | `--brand-text` | Links, active nav labels, accent text (AA on `--bg`) |
| Brand tint | `rgba(124,58,237,.16)` | `--brand-tint` | Selected rows, badges, soft fills |
| Brand gradient | `linear-gradient(135deg,#7C3AED,#6D28D9,#4F46E5)` | `--gradient-brand` | Primary buttons, signature medallions |
| Hero gradient | `linear-gradient(165deg,#0D0B14 10%,#2A1245 55%,#551D67 100%)` | `--gradient-hero` | Marketing hero / auth screens — plum glow rising from dark |
| Gold (verified — sparing) | `#E3B341` | `--gold` | Verified badge, premium marks only |
| Gold tint | `rgba(227,179,65,.12)` | `--gold-tint` | Verified pill background |
| Success | `#34D399` | `--success` | Published, positive deltas |
| Warning | `#FBBF24` | `--warning` | Pending, attention |
| Danger | `#F87171` | `--danger` | Destructive, expired/errors |
| Info / link (rare) | `#60A5FA` | `--info` | Inline informational only |

**Status pills (trademark domain):** Draft → muted slate (`--text-muted` on
`rgba(126,119,149,.14)`), Published/Registered → `--brand-text` on
`--brand-tint`, Pending → `--warning` tint, Expired → `--danger` tint.
Status text colours are the *light* variants above — never the saturated
mid-tones, which fail contrast on dark.

**Do:** body text `--text` on `--bg`/`--surface`; each elevation step uses the
next lighter surface; violet reserved for actions and a few signals; the hero
gradient as a deliberate backdrop; success/danger only as small accents.
**Don't:** pure `#000` backgrounds, pure `#FFF` text (use `--text`), grey
surfaces with no purple cast (reads as a different product), rainbow status
colours, more than 2 accents per screen, neon glows on everything.

---

## Typography

Unchanged fonts — a serif display + grotesque body. On dark, the serif is
what keeps the product feeling editorial and premium instead of "crypto
dashboard".

- **Display / Headings:** **Fraunces** (serif), weights 400/500/600, optical
  sizing on. h1–h3, hero, section titles, listing titles, big dashboard
  numbers.
- **Body / UI:** **Inter**, weights 400/500/600/700. Everything else,
  including registration numbers and prices (no monospace — founder decision).

**Scale (rem):** display `3.5` · h1 `2.25` · h2 `1.75` · h3 `1.375` ·
body-lg `1.125` · body `1` · sm `0.875` · xs `0.75`.
Display/h1/h2 use Fraunces, tracking `-0.02em`, line-height `1.05–1.15`.
Body line-height `1.6`. Headlines stay **confident and large**.

**Dark-mode type rules:** set `-webkit-font-smoothing: antialiased`; light
text on dark optically thickens, so prefer weight 400/500 where the light
theme used 500/600 for body-size text (headlines keep their weights). Large
Fraunces display numbers may use `--brand-text` or white — never mid-violet.

---

## Spacing, radius, elevation

**Spacing (4px base):** `--space-1..` = 4, 8, 12, 16, 24, 32, 48, 64, 96.
Sections breathe at 48–96, components at 16–24.

**Radius:** `--radius-sm 6px` · `md 10px` · `lg 14px` · `xl 20px` · `full`.
Cards/inputs use `md`–`lg`. Don't pill everything.

**Elevation (the dark-mode tell):** on dark, elevation = **lighter surface +
shadow**, not shadow alone. Each layer up uses the next surface token
(`--bg` → `--surface` → `--surface-raised`) plus:

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,.45);
--shadow-md: 0 4px 14px -2px rgba(0,0,0,.55);
--shadow-lg: 0 16px 40px -12px rgba(0,0,0,.65);
--glow-brand: 0 0 28px rgba(124,58,237,.28);  /* hero CTAs & medallions ONLY */
--focus-ring: 0 0 0 3px rgba(167,139,250,.40);
```

Cards always carry a `1px --border` border — on dark, borders do the
separating work shadows did on light. `--glow-brand` is a signature accent
for at most one element per screen (hero CTA, verified medallion); glows
everywhere = cheap.

---

## Motion

- Durations: 150ms (hover/colour), 200ms (default), 300ms (enter/reveal).
- Easing: `cubic-bezier(.2,.8,.2,1)` (confident ease-out).
- Interactive lift: buttons/controls `translateY(-1px..-2px)` + shadow step-up
  on hover. Inputs/buttons transition `background, box-shadow, transform`.
- Page/section content may fade-and-rise 8–12px on first paint. On dark, a
  subtle opacity fade on the hero gradient reads especially well.
- **Always** wrap non-essential motion in `@media (prefers-reduced-motion: reduce)`.

---

## Signature elements (make it unmistakably Spiral Nexus)

- **Woven-slat mark motif:** the logo mark (`spiral-nexus-mark-white.png`) at
  3–6% opacity, large-scale, as a background flourish in the hero, empty
  states, and auth screens. This replaces the old concentric-ring/spiral
  motif. Subtle, never loud.
- **Plum horizon:** the `--gradient-hero` wash (dark → plum) behind marketing
  heroes and the auth screen — the brand's "glow rising from dark" moment.
- **Verified badge:** gold pill with a check — the only routine use of gold.
- **Rich empty states:** faint mark motif + one-line value statement + primary
  CTA. Never a lone muted sentence on a dark void.
- **Data chips:** Nice class as a small labelled chip (e.g. `NICE 9`) —
  `--surface-raised` bg, `--border`, `--text-secondary`.
- **Stat cards with sparklines** (dashboard): big Fraunces number, delta pill
  (`--success`/`--danger` tint), small violet sparkline — the mood board's
  data-rich look, in our tokens.

> **Removed (founder decisions):** the 2px brand accent-edge on cards (do NOT
> re-add it), monospace for data, and the light theme itself.

---

## Component specs

**Buttons**
- Primary: solid `--brand` bg, white text, `--radius-md`, weight 600,
  hover `--brand-hover` + lift; focus `--focus-ring`. Hero/marketing CTAs may
  use `--gradient-brand` (+ `--glow-brand` on the single hero CTA).
- Secondary: `--surface-raised` bg, `1px --border-strong` border, `--text`
  text; hover lightens bg one step.
- Ghost: transparent, `--text-secondary`, hover `--surface-raised` fill.
- Destructive: `--danger` text + border, hover `rgba(248,113,113,.12)` fill.
- Min height 40px (44px touch); `cursor-pointer`; visible focus always.

**Cards (listing/asset)**
- `--surface`, `--radius-lg`, `1px --border`, `--shadow-sm`. **No card-level
  hover effect** (founder decision) — only controls inside respond.
- Structure: mark/image block (16:10, `--surface-raised` placeholder with
  faint mark motif if no image) → title (Fraunces, `--text`) → meta row
  (jurisdiction · `NICE n` chip) → status pill + price. Padding 20–24px.

**Inputs**
- `--surface` bg, `1px --border-strong`, `--radius-md`, 40px+; focus →
  `--brand` border + `--focus-ring`. Labels `--text-secondary` 500.
  Placeholders `--text-muted`. Errors in `--danger`.

**Status pill** — small, `--radius-full`, tinted bg + light-variant text per
mapping above; 500 weight.

**Top nav** — `--bg` (or `--surface`) with bottom `1px --border`; white mark
(`spiral-nexus-mark-white.png`, ~28px) + wordmark in Fraunces `--text`; quiet
links in `--text-secondary` (active: `--brand-text`); primary CTA button.

**Table** — `--surface-raised` header row, `--border` row dividers, row hover
`--surface-raised`; keep airy, no zebra striping.

**Dialog / Toast** — `--surface-raised`, `--radius-lg`, `--shadow-lg`, `1px
--border`; toast via Sonner (dark theme).

**Charts** (dashboard) — violet primary series (`--brand-text` line,
`--brand-tint` fill), `--border` gridlines, `--text-muted` axes. One accent
series max (gold or success). Never rainbow palettes.

---

## Implementation notes

- Define every token above as a CSS custom property in `app/globals.css` and
  expose through Tailwind v4 `@theme` + the shadcn CSS-variable theme
  (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, …) so
  utilities and shadcn components read the same source. The dark values ARE
  the base `:root` values — no `.dark` class gymnastics, no toggle.
- Set `color-scheme: dark` on `:root` so native controls (scrollbars,
  date pickers, autofill) render dark.
- Load fonts via `next/font` (Fraunces, Inter); map to `--font-display`,
  `--font-sans`.
- shadcn primitives stay the base; restyle via tokens — never default shadcn.
- Meta: `theme-color #0D0B14`; OG image `public/brand/spiral-nexus-og.jpg`;
  favicon from `spiral-nexus-mark-white.png` (on transparent or `#0D0B14`).

## Anti-patterns (the dark-mode failure modes to avoid)

- Pure `#000` canvas or neutral-grey surfaces with no purple cast → dead,
  off-brand.
- Borderless cards on dark → shapes dissolve; every card needs its border.
- Saturated mid-tone colours as text (e.g. `#7C3AED` body text) → contrast
  failure; use the `-text`/light variants.
- Glow on everything, neon accents, cyberpunk grids → cheap futurism. One
  glow per screen, max.
- White `#FFF` body text at weight 600 → blown-out, harsh; use `--text` and
  lighter weights.
- Default shadcn dark theme with no token theming → generic.
- Emoji headings, flat/cheap gradients, lone muted-text empty states → slop.
- Light-mode screens anywhere in the product → violates the founder decision.
