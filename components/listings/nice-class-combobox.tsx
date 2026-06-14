"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { NICE_CLASSES } from "@/lib/discovery";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const labelFor = (c: { value: number; label: string }) => `${c.value} — ${c.label}`;

// Typeahead for the Nice classification (1–45). Type to filter by number or
// label; stores the selected class as an integer (or null). Hand-rolled
// (input + filtered listbox) — base-ui's Menu popup crashes this stack.
export function NiceClassCombobox({
  value,
  onChange,
  id,
  placeholder = "Any class",
  ariaInvalid,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  id?: string;
  placeholder?: string;
  ariaInvalid?: boolean;
}) {
  const selected =
    value != null ? NICE_CLASSES.find((c) => c.value === value) : undefined;
  const [query, setQuery] = useState(selected ? labelFor(selected) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Reflect external value changes (e.g. "Clear filters", edit-form load)
  // during render — the React-recommended alternative to a sync effect.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setQuery(selected ? labelFor(selected) : "");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && q === labelFor(selected).toLowerCase())) {
      return NICE_CLASSES;
    }
    return NICE_CLASSES.filter(
      (c) =>
        String(c.value).startsWith(q) ||
        c.label.toLowerCase().includes(q) ||
        labelFor(c).toLowerCase().includes(q),
    );
  }, [query, selected]);

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

  function select(c: { value: number; label: string }) {
    onChange(c.value);
    setQuery(labelFor(c));
    setOpen(false);
  }

  function onInput(v: string) {
    setQuery(v);
    setOpen(true);
    setActive(0);
    if (!v.trim()) onChange(null);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && open && filtered[active]) {
      e.preventDefault();
      select(filtered[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
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
        onChange={(e) => onInput(e.target.value)}
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
          className="absolute z-40 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-slate-500">No matching class</li>
          ) : (
            filtered.map((c, i) => {
              const isSel = value === c.value;
              return (
                <li
                  key={c.value}
                  role="option"
                  aria-selected={isSel}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    select(c);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm",
                    i === active
                      ? "bg-accent text-accent-foreground"
                      : "text-slate-700",
                  )}
                >
                  <span>
                    <span className="font-medium">{c.value}</span> — {c.label}
                  </span>
                  {isSel && <Check className="size-4 text-brand" aria-hidden />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
