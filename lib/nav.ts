// Single source of truth for navigation. The header, account menu, and footer
// all render from these arrays, so later slices add a link by appending one
// entry here — never by editing the shared JSX (kills the nav merge-conflict).

import {
  Bookmark,
  FileText,
  Landmark,
  List,
  MessagesSquare,
  Search,
  Settings,
  Shield,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavVisibility = "guest" | "authed" | "both";

export interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  visibility?: NavVisibility;
}

// Primary top-nav destinations for signed-in users. Kept deliberately short
// (founder feedback: the header was cluttered) — Browse is the product home,
// then the owner's listings, the member network, and messaging. Everything
// else (Saved, Registries, account, legal) lives in the account menu below.
// Icons are used when these render inside the mobile account menu.
export const appNav: NavLink[] = [
  { href: "/listings", label: "Browse", icon: Search },
  { href: "/dashboard/listings", label: "My listings", icon: List },
  { href: "/network", label: "Connect", icon: Users },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
];

// Marketing links for signed-out visitors. Browse is sign-in-only, so it's
// intentionally absent.
export const marketingNav: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
];

// Account dropdown (signed-in) — the "Me" menu. It no longer duplicates the
// primary destinations in `appNav` on desktop; it owns the personal + account
// + legal links. On mobile (where the top nav is hidden) the header also
// renders `appNav` at the top of this menu, so every destination stays
// reachable. Sign-out is an action, rendered separately.
export const accountMenu: NavLink[] = [
  { href: "/dashboard", label: "Your profile", icon: User },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/registries", label: "Registries", icon: Landmark },
  { href: "/dashboard/account", label: "Account & data", icon: Settings },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/terms", label: "Terms", icon: FileText },
];

// ---- Footer (one component, auth-aware; see components/marketing/site-footer) ----
// Primary column, signed-out visitors.
export const footerNavGuest: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
];

// Primary column, signed-in users (mirrors the top nav so the footer is a
// consistent secondary way to reach the product).
export const footerNavAuthed: NavLink[] = [
  { href: "/listings", label: "Browse" },
  { href: "/network", label: "Connect" },
  { href: "/messages", label: "Messages" },
];

// Legal column — shown in the footer for everyone, so Privacy/Terms are always
// reachable from any surface (fixes the marketing-vs-app footer inconsistency).
export const footerLegal: NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
