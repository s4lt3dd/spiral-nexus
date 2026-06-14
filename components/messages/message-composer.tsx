"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/app/(app)/messages/actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function doSend() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const result = await sendMessage({ conversationId, body });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        doSend();
      }}
      className="flex items-end gap-2"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Write a reply…  (⌘/Ctrl + Enter to send)"
        className="max-h-40 min-h-11 flex-1"
        disabled={submitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            doSend();
          }
        }}
      />
      <Button type="submit" disabled={submitting || !body.trim()}>
        <SendHorizontal className="size-4" aria-hidden />
        Send
      </Button>
    </form>
  );
}
