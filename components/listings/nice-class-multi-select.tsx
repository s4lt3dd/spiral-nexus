"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { NICE_CLASSES } from "@/lib/discovery";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const labelFor = (c: { value: number; label: string }) =>
  `${c.value} — ${c.label}`;

// Multi-select typeahead for Nice classes (1–45): selected classes render as
// removable chips; typing filters the listbox and Enter/click toggles.
// Follows the hand-rolled input+listbox pattern of NiceClassCombobox
// (base-ui's Menu popup crashes this stack).
export function NiceClassMultiSelect({
  values,
  onChange,
  id,
  placeholder = "Search classes…",
  ariaInvalid,
}: {
  values: number[];
  onChange: (values: number[]) => void;
  id?: string;
  placeholder?: string;
  ariaInvalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NICE_CLASSES;
    return NICE_CLASSES.filter(
      (c) =>
        String(c.value).startsWith(q) ||
        c.label.toLowerCase().includes(q) ||
        labelFor(c).toLowerCase().includes(q),
    );
  }, [query]);

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

  function toggle(v: number) {
    onChange(
      values.includes(v)
        ? values.filter((x) => x !== v)
        : [...values, v].sort((a, b) => a - b),
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
          {values.map((v) => {
            const c = NICE_CLASSES.find((x) => x.value === v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 rounded-full bg-brand-tint py-0.5 pr-1 pl-2.5 text-xs font-medium text-brand-text"
              >
                {c ? labelFor(c) : v}
                <button
                  type="button"
                  aria-label={`Remove class ${v}`}
                  onClick={() => toggle(v)}
                  className="rounded-full p-0.5 transition-colors hover:bg-brand/15"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            );
          })}
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
                No matching class
              </li>
            ) : (
              filtered.map((c, i) => {
                const isSel = values.includes(c.value);
                return (
                  <li
                    key={c.value}
                    role="option"
                    aria-selected={isSel}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(c.value);
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
                    {isSel && <Check className="size-4 text-brand-text" aria-hidden />}
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
