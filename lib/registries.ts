// Slice 7: outbound deep-links to official IP-office trademark search.
//
// IMPORTANT (verified June 2026): none of these registries expose a reliable
// free-text GET query param for deep-linking a search —
//   - USPTO (tmsearch.uspto.gov) and WIPO Global Brand Database (branddb.wipo.int)
//     are SPAs with no documented text-query URL param (WIPO's terms also
//     disallow automated querying);
//   - UKIPO trade mark text search uses a POST form;
//   - EUIPO eSearch is an SPA whose search state lives in an undocumented
//     hash fragment, not a stable GET param (its predecessor here, TMview,
//     was dropped July 2026 — tmview.org fails its TLS handshake).
// So we open each registry's official SEARCH LANDING page and copy the user's
// query to the clipboard to paste — no fake pre-filled links. If a registry
// later documents a GET query format, add `buildSearchUrl` and the UI will
// deep-link automatically (see registryUrl).

export interface Registry {
  id: string;
  name: string;
  jurisdiction: string;
  landingUrl: string;
  // Optional: only set this if the registry documents a real free-text GET query.
  buildSearchUrl?: (query: string) => string;
  blurb: string;
}

export const REGISTRIES: Registry[] = [
  {
    id: "uspto",
    name: "USPTO",
    jurisdiction: "United States",
    landingUrl: "https://tmsearch.uspto.gov/",
    blurb: "United States Patent and Trademark Office — trademark search.",
  },
  {
    id: "ukipo",
    name: "UKIPO",
    jurisdiction: "United Kingdom",
    landingUrl: "https://www.gov.uk/search-for-trademark",
    blurb: "UK Intellectual Property Office — trade mark search.",
  },
  {
    id: "euipo",
    name: "EUIPO",
    jurisdiction: "European Union",
    landingUrl: "https://euipo.europa.eu/eSearch/",
    blurb: "EU Intellectual Property Office — eSearch trade mark search.",
  },
  {
    id: "wipo",
    name: "WIPO",
    jurisdiction: "International",
    landingUrl: "https://branddb.wipo.int/",
    blurb: "WIPO Global Brand Database — international marks.",
  },
];

// Deep-link if (and only if) the registry supports a real query format;
// otherwise the official landing page. Never fabricates a pre-filled link.
export function registryUrl(r: Registry, query: string): string {
  const q = query.trim();
  return q && r.buildSearchUrl ? r.buildSearchUrl(q) : r.landingUrl;
}

// True when opening the landing page (so the UI copies the query to paste).
export function isLandingOnly(r: Registry, query: string): boolean {
  return !(query.trim() && r.buildSearchUrl);
}
