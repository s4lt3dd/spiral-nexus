// Zod boundary for messaging. Server actions re-validate every payload.

import { z } from "zod";

const body = z.string().trim().min(1, "Write a message").max(2000);

export const contactSchema = z.object({
  listingId: z.string().uuid(),
  body,
});

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body,
});

export type ContactInput = z.input<typeof contactSchema>;
export type MessageInput = z.input<typeof messageSchema>;
