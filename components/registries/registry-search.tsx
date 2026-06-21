"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";

import { REGISTRIES, registryUrl, isLandingOnly } from "@/lib/registries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export function RegistrySearch() {
  const [q, setQ] = useState("");

  // Real outbound anchor (the registry opens in a new tab). When we can only
  // reach the landing page, also copy the query so it can be pasted — we never
  // fabricate a pre-filled deep link.
  function onOpen(name: string, landingOnly: boolean) {
    const query = q.trim();
    if (query && landingOnly && navigator.clipboard) {
      navigator.clipboard
        .writeText(query)
        .then(() => toast.success(`Copied “${query}” — paste it into ${name}.`))
        .catch(() => {});
    }
  }

  return (
    <div>
      <div className="max-w-xl space-y-1.5">
        <Label htmlFor="registry-q">Trademark or brand name</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="registry-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. NIMBUS"
            className="pl-9"
          />
        </div>
        <p className="text-sm text-slate-500">
          Choose a registry to open its official search. We&apos;ll copy your
          term to the clipboard so you can paste it.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {REGISTRIES.map((r) => {
          const landingOnly = isLandingOnly(r, q);
          return (
            <a
              key={r.id}
              href={registryUrl(r, q)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onOpen(r.name, landingOnly)}
              className="group rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25"
            >
              <Card className="h-full gap-0 p-5 transition-[transform,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:border-brand/30 group-hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-medium text-foreground">
                    {r.name}
                  </h3>
                  <ExternalLink
                    className="size-4 text-slate-400 transition-colors group-hover:text-brand"
                    aria-hidden
                  />
                </div>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {r.jurisdiction}
                </p>
                <p className="mt-3 text-sm text-slate-600">{r.blurb}</p>
              </Card>
            </a>
          );
        })}
      </div>
    </div>
  );
}
