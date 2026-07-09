// Single source of truth for navigation. The header, account menu, and footer
// all render from these arrays, so later slices add a link by appending one
// entry here — never by editing the shared JSX (kills the nav merge-conflict).

import {
  Bookmark,
  FileText,
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

// Top-nav links for signed-in users (the product surface). The brand logo
// links to the marketing Home page (not repeated here). About is kept in the
// signed-in nav too, for visibility, per founder feedback.
export const appNav: NavLink[] = [
  { href: "/dashboard/listings", label: "My listings" },
  { href: "/listings", label: "Browse" },
  { href: "/saved", label: "Saved" },
  { href: "/network", label: "Connect" },
  { href: "/registries", label: "Registries" },
  { href: "/messages", label: "Messages" },
  { href: "/about", label: "About" },
];

// Marketing links for signed-out visitors. Browse is sign-in-only, so it's
// intentionally absent.
export const marketingNav: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
];

// Account dropdown (signed-in). Sign-out is an action, rendered separately.
export const accountMenu: NavLink[] = [
  { href: "/dashboard", label: "Your profile", icon: User },
  { href: "/dashboard/listings", label: "My listings", icon: List },
  { href: "/listings", label: "Browse", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/network", label: "Connect", icon: Users },
  { href: "/messages", label: "Messages", icon: MessagesSquare },
  { href: "/dashboard/account", label: "Account & data", icon: Settings },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/terms", label: "Terms", icon: FileText },
];

// Slim footer for the signed-in product surface: just the legal + account
// links that must stay reachable inside the app (the full marketing footer
// would be noise here). Append legal links here, not the page JSX.
export const appFooterNav: NavLink[] = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/dashboard/account", label: "Account" },
];

// Footer links. Slices add legal/marketing links by appending here.
export const footerNav: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/subscriptions", label: "Plans" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];
