"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { startConversation } from "@/app/(app)/messages/actions";

// "Contact owner" CTA + modal composer. On send it starts (or reuses) the
// conversation and routes to the thread.
export function ContactOwnerDialog({
  listingId,
  ownerName,
}: {
  listingId: string;
  ownerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  async function submit() {
    if (!body.trim()) return;
    setSubmitting(true);
    const result = await startConversation({ listingId, body });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Message sent.");
    setOpen(false);
    router.push(`/messages/${result.conversationId}`);
  }

  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        <MessagesSquare className="size-4" aria-hidden />
        Contact owner
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-title"
            className="relative z-10 w-full max-w-md rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg"
          >
            <h2
              id="contact-title"
              className="font-display text-lg font-medium text-ink"
            >
              Contact {ownerName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Send a message about this listing. They&apos;ll see your name and
              can reply in their inbox.
            </p>
            <Textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Introduce yourself and what you're interested in…"
              className={cn("mt-4")}
              disabled={submitting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={submit} disabled={submitting || !body.trim()}>
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
