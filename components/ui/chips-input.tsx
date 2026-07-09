"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";

// Free-entry chips input: type a value, Enter (or comma) adds it as a
// removable chip. Used for listing territory (countries) — anywhere a short
// user-defined string list is needed.
export function ChipsInput({
  values,
  onChange,
  id,
  placeholder,
  max = 60,
  ariaInvalid,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  id?: string;
  placeholder?: string;
  max?: number;
  ariaInvalid?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim().replace(/,+$/, "").trim();
    if (!v || values.length >= max) return;
    // Case-insensitive dedupe, keep the first spelling entered.
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-slate-700"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-full p-0.5 transition-colors hover:bg-slate-200"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
      />
    </div>
  );
}
