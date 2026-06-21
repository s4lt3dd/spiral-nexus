"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import {
  PROFILE_ROLES,
  SECTORS,
  JURISDICTIONS,
  roleLabel,
} from "@/lib/profile";
import { MEMBER_SORT_OPTIONS, type MemberParams } from "@/lib/members";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function MemberFilters({ current }: { current: MemberParams }) {
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
    current.q || current.role || current.sector || current.jurisdiction,
  );

  function clearAll() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      {/* Keyword */}
      <div className="space-y-1.5">
        <Label htmlFor="q">Search members</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            id="q"
            value={q}
            onChange={(e) => onKeyword(e.target.value)}
            placeholder="Search by name, headline, or organisation…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="role">Looking for</Label>
          <Select
            items={PROFILE_ROLES.map((r) => ({ value: r.value, label: r.label }))}
            value={current.role ?? null}
            onValueChange={(v) => setParam("role", v)}
          >
            <SelectTrigger id="role" className="w-full">
              <SelectValue placeholder="Any role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any role</SelectItem>
              {PROFILE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {roleLabel(r.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sector">Sector</Label>
          <Select
            items={SECTORS.map((s) => ({ value: s, label: s }))}
            value={current.sector ?? null}
            onValueChange={(v) => setParam("sector", v)}
          >
            <SelectTrigger id="sector" className="w-full">
              <SelectValue placeholder="Any sector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any sector</SelectItem>
              {SECTORS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jurisdiction">Jurisdiction</Label>
          <Select
            items={JURISDICTIONS.map((j) => ({ value: j, label: j }))}
            value={current.jurisdiction ?? null}
            onValueChange={(v) => setParam("jurisdiction", v)}
          >
            <SelectTrigger id="jurisdiction" className="w-full">
              <SelectValue placeholder="Any jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Any jurisdiction</SelectItem>
              {JURISDICTIONS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sort">Sort by</Label>
          <Select
            items={MEMBER_SORT_OPTIONS.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
            value={current.sort}
            onValueChange={(v) => setParam("sort", v)}
          >
            <SelectTrigger id="sort" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_SORT_OPTIONS.map((s) => (
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
