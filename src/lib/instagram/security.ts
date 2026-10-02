import { createHmac, timingSafeEqual } from "node:crypto";

export function constantTimeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function validOAuthState(expected: string, actual: string) {
  return Boolean(expected && actual && constantTimeEqual(expected, actual));
}
export function validMetaSignature(raw: string, signature: string, secret: string) {
  return constantTimeEqual(signature, `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`);
}
export function withinStandardMessagingWindow(lastInboundAt: string | null, now = Date.now()) {
  if (!lastInboundAt) return false;
  const sent = new Date(lastInboundAt).getTime();
  return Number.isFinite(sent) && now >= sent && now - sent <= 24 * 60 * 60 * 1000;
}
export function conversationRecipient<T extends { id: string; participants?: { data?: { id: string }[] } }>(conversations: T[], conversationId: string | undefined, accountId: string) {
  const conversation = conversations.find(item => item.id === conversationId);
  const recipient = conversation?.participants?.data?.find(person => person.id !== accountId);
  return conversation && recipient ? { conversation, recipient } : null;
}
export function outboundMessageRecord(conversationId: string, instagramMessageId: string, body: string, sentAt: string) {
  return { app_id: "sales_copilot", conversation_id: conversationId, instagram_message_id: instagramMessageId, direction: "outbound", body, sent_at: sentAt } as const;
}
