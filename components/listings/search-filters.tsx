"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import {
  JURISDICTIONS,
  SORT_OPTIONS,
  type DiscoveryParams,
} from "@/lib/discovery";
import { DEAL_TYPES } from "@/lib/listings";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NiceClassCombobox } from "@/components/listings/nice-class-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SearchFilters({ current }: { current: DiscoveryParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(current.q ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function push(mut: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page"); // any filter change returns to the first page
    const qs = p.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  const setParam = (key: string, value: string | null) =>
    push((p) => (value ? p.set(key, value) : p.delete(key)));

  function onKeyword(v: string) {
    setQ(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", v.trim()), 350);
  }

  const hasFilters = Boolean(
    current.q || current.nice_class || current.jurisdiction || current.deal_type,
  );

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      {/* Keyword */}
      <div className="space-y-1.5">
        <Label htmlFor="q">Search trademarks</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="q"
            value={q}
            onChange={(e) => onKeyword(e.target.value)}
            placeholder="Search by brand name…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="nice_class">Nice class</Label>
          <NiceClassCombobox
            id="nice_class"
            value={current.nice_class ?? null}
            onChange={(n) => setParam("nice_class", n ? String(n) : null)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jurisdiction">Registration office</Label>
          <Select
            items={JURISDICTIONS.map((j) => ({ value: j, label: j }))}
            value={current.jurisdiction ?? null}
            onValueChange={(v) => setParam("jurisdiction", v)}
          >
            <SelectTrigger id="jurisdiction" className="w-full">
              <SelectValue placeholder="Any office" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any office</SelectItem>
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deal_type">Deal type</Label>
          <Select
            items={DEAL_TYPES.map((d) => ({ value: d.value, label: d.label }))}
            value={current.deal_type ?? null}
            onValueChange={(v) => setParam("deal_type", v)}
          >
            <SelectTrigger id="deal_type" className="w-full">
              <SelectValue placeholder="Any deal type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any deal type</SelectItem>
              {DEAL_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort">Sort by</Label>
          <Select
            items={SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
            value={current.sort}
            onValueChange={(v) => setParam("sort", v)}
          >
            <SelectTrigger id="sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-4" aria-hidden />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
