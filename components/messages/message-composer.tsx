"use client";

import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Controlled, presentational composer. The parent (MessageThread) owns the draft
// and the send logic so sending can be optimistic — we never disable input on
// submit, the bubble appears instantly and the field is free for the next line.
export function MessageComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex items-end gap-2"
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Write a reply…  (⌘/Ctrl + Enter to send)"
        className="max-h-40 min-h-11 flex-1"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
      />
      <Button type="submit" disabled={!value.trim()}>
        <SendHorizontal className="size-4" aria-hidden />
        Send
      </Button>
    </form>
  );
}
