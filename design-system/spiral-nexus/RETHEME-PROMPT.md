# Dark-mode re-theme — kickoff prompt

Paste the prompt below into a fresh Claude Code session to execute the
re-theme. It routes the work through the `ui-ux-pro-max` skill and the
updated MASTER.md.

---

Use the ui-ux-pro-max skill and re-theme the entire Spiral Nexus product to
the new authoritative dark theme.

`design-system/spiral-nexus/MASTER.md` has been rewritten (founder decision,
July 2026): dark mode is THE theme — there is no light mode and no toggle.
Read MASTER.md first and treat it as the source of truth for every token and
component spec; use ui-ux-pro-max for UX/accessibility judgement on top of it.

Scope:
1. Rewrite the token layer in `app/globals.css` (Tailwind v4 `@theme` + shadcn
   CSS variables) so the dark values from MASTER.md ARE the `:root` values.
   Set `color-scheme: dark` and `theme-color #0D0B14`.
2. Sweep every existing surface — marketing pages, auth/login, dashboard,
   listings CRUD, browse/detail/filters, messaging, activity/notifications,
   legal pages — replacing any hardcoded light-mode colors with tokens.
   Delete/replace light-only styles rather than layering dark on top.
3. Wire the brand assets from `public/brand/`: white mark
   (`spiral-nexus-mark-white.png`) + Fraunces wordmark in the shared
   `components/marketing/site-header.tsx`, favicon from the white mark,
   OG image `spiral-nexus-og.jpg`, footer lockup `spiral-nexus-white.png`.
4. Apply the signature elements from MASTER.md: plum hero gradient, faint
   mark motif in hero/empty states, gold verified pill, stat cards with
   sparklines on the dashboard.
5. Respect the standing founder decisions: no card hover effects, no
   monospace data, no 2px accent edge on cards, purple gradients are on-brand.
   No EM dashes 
6. Verify in the browser preview at desktop and mobile widths: check contrast
   (AA) on status pills, muted text, and links; check native controls
   (scrollbars, inputs, autofill) render dark; screenshot the key pages as
   proof.

Work slice by slice (marketing → auth → app shell → dashboard → listings →
browse → messaging), committing per slice.
