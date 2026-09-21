import { supabaseRequest } from "@/src/lib/supabase/server";
import { processInboundReply } from "@/src/lib/learning/reply-linking";
import { getConversationMessages, getConversations, getInstagramAccount } from "./client";
import { evaluateAutoReply } from "@/src/lib/auto-reply/service";
import type { Connection } from "./repository";

type StoredConversation = { id: string; instagram_conversation_id: string; lead_id: string | null };
type Lead = { id: string; instagram_username: string };
export async function syncConversations(connection: Connection) {
  const account = await getInstagramAccount(connection.access_token);
  const instagramAccountId = account.user_id ?? connection.instagram_user_id;
  if (instagramAccountId !== connection.instagram_user_id) {
    await supabaseRequest(`sales_instagram_connections?id=eq.${encodeURIComponent(connection.id)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ instagram_user_id: instagramAccountId, updated_at: new Date().toISOString() }) });
  }
  const remote = await getConversations(connection.access_token, instagramAccountId);
  const leads = await supabaseRequest<Lead[]>("sales_leads?app_id=eq.sales_copilot&select=id,instagram_username");
  const byHandle = new Map(leads.map(lead => [lead.instagram_username.toLowerCase(), lead.id]));
  let messagesSynced = 0;
  for (const item of remote.data) {
    const participant = item.participants?.data?.find(p => p.id !== instagramAccountId);
    const leadId = participant?.username ? byHandle.get(participant.username.toLowerCase()) ?? null : null;
    const existing = await supabaseRequest<StoredConversation[]>(`sales_conversations?app_id=eq.sales_copilot&instagram_conversation_id=eq.${encodeURIComponent(item.id)}&select=id,instagram_conversation_id,lead_id`);
    const payload = { app_id: "sales_copilot", instagram_conversation_id: item.id, lead_id: leadId ?? existing[0]?.lead_id ?? null, last_synced_at: new Date().toISOString(), status: "active" };
    const path = existing[0] ? `sales_conversations?id=eq.${encodeURIComponent(existing[0].id)}&app_id=eq.sales_copilot` : "sales_conversations";
    const stored = await supabaseRequest<StoredConversation[]>(path, { method: existing[0] ? "PATCH" : "POST", body: JSON.stringify(payload) });
    const conversationId = stored[0].id;
    const messages = await getConversationMessages(connection.access_token, item.id);
    for (const message of messages.data) {
      const prior = await supabaseRequest<{ id: string }[]>(`sales_messages?app_id=eq.sales_copilot&instagram_message_id=eq.${encodeURIComponent(message.id)}&select=id`);
      if (prior.length) continue;
      const direction = message.from?.id === instagramAccountId ? "outbound" : "inbound";
      const body = message.message || "[Non-text message]";
      const sentAt = message.created_time || new Date().toISOString();
      const storedMessage = await supabaseRequest<{ id: string }[]>("sales_messages", { method: "POST", body: JSON.stringify({ app_id: "sales_copilot", conversation_id: conversationId, instagram_message_id: message.id, direction, body, sent_at: sentAt }) });
      if (direction === "inbound" && storedMessage[0]) { await processInboundReply({ id: storedMessage[0].id, conversation_id: conversationId, direction, body, sent_at: sentAt }); await evaluateAutoReply({ message: body, messageId: storedMessage[0].id, conversationId, leadId: leadId || undefined }); }
      messagesSynced++;
    }
    if (leadId) await supabaseRequest<unknown>(`sales_leads?id=eq.${encodeURIComponent(leadId)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ instagram_conversation_id: item.id, updated_at: new Date().toISOString() }) });
  }
  return { conversations: remote.data.length, messagesSynced };
}
