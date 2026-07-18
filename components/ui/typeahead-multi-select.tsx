"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Generic typeahead multi-select: selected values render as removable chips,
// typing filters the listbox, Enter/click toggles. Replaces long walls of
// toggle-pills for larger option sets (sectors, jurisdictions, Nice classes).
// Hand-rolled input+listbox (base-ui's Menu popup crashes this stack — same
// reason as NiceClassMultiSelect). Selection order is preserved.
export function TypeaheadMultiSelect<T extends string | number>({
  options,
  values,
  onChange,
  id,
  placeholder = "Search…",
  ariaInvalid,
}: {
  options: { value: T; label: string }[];
  values: T[];
  onChange: (values: T[]) => void;
  id?: string;
  placeholder?: string;
  ariaInvalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const labelOf = useMemo(() => {
    const m = new Map(options.map((o) => [o.value, o.label] as const));
    return (v: T) => m.get(v) ?? String(v);
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        String(o.value).toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle(v: T) {
    onChange(
      values.includes(v) ? values.filter((x) => x !== v) : [...values, v],
    );
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && filtered[active]) toggle(filtered[active].value);
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={String(v)}
              className="inline-flex items-center gap-1 rounded-full bg-brand-tint py-0.5 pr-1 pl-2.5 text-xs font-medium text-brand-text"
            >
              {labelOf(v)}
              <button
                type="button"
                aria-label={`Remove ${labelOf(v)}`}
                onClick={() => toggle(v)}
                className="rounded-full p-0.5 transition-colors hover:bg-brand/15"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative" ref={ref}>
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={ariaInvalid}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="pr-9"
        />
        <ChevronsUpDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable
            className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {filtered.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-slate-500">
                No matches
              </li>
            ) : (
              filtered.map((o, i) => {
                const isSel = values.includes(o.value);
                return (
                  <li
                    key={String(o.value)}
                    role="option"
                    aria-selected={isSel}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(o.value);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                      i === active
                        ? "bg-accent text-accent-foreground"
                        : "text-slate-700",
                    )}
                  >
                    <span>{o.label}</span>
                    {isSel && (
                      <Check className="size-4 text-brand-text" aria-hidden />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
