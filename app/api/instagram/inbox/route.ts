import { NextRequest, NextResponse } from "next/server";
import { getConversationMessages, getConversations, getInstagramAccount, sendInstagramReply } from "@/src/lib/instagram/client";
import { getUsableConnection } from "@/src/lib/instagram/connection";
import { safeMetaMessage } from "@/src/lib/instagram/admin";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { conversationRecipient, outboundMessageRecord, withinStandardMessagingWindow } from "@/src/lib/instagram/security";

type StoredConversation = { id: string; instagram_conversation_id: string };
type StoredMessage = { sent_at: string; direction: string };

async function context() {
  const connection = await getUsableConnection();
  if (!connection) throw new Error("Instagram is not connected.");
  const account = await getInstagramAccount(connection.access_token);
  return { connection, accountId: account.user_id ?? connection.instagram_user_id };
}

export async function GET(request: NextRequest) {
  try {
    const { connection, accountId } = await context();
    const remote = await getConversations(connection.access_token, accountId);
    const selected = request.nextUrl.searchParams.get("conversation_id");
    if (!selected) return NextResponse.json({ conversations: remote.data });
    if (!remote.data.some(item => item.id === selected)) return NextResponse.json({ error: "Conversation is not available to this connected account." }, { status: 404 });
    const messages = await getConversationMessages(connection.access_token, selected);
    return NextResponse.json({ conversation_id: selected, messages: messages.data });
  } catch (error) {
    return NextResponse.json({ error: safeMetaMessage(error) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { conversation_id?: string; message?: string; approved?: boolean };
    const message = body.message?.trim() ?? "";
    if (body.approved !== true) return NextResponse.json({ error: "Explicit approval is required." }, { status: 400 });
    if (!message || message.length > 1000) return NextResponse.json({ error: "Reply must be 1–1000 characters." }, { status: 400 });
    const { connection, accountId } = await context();
    if (!(connection.scopes ?? []).includes("instagram_business_manage_messages")) return NextResponse.json({ error: "Missing instagram_business_manage_messages permission." }, { status: 403 });
    const remote = await getConversations(connection.access_token, accountId);
    const selected = conversationRecipient(remote.data, body.conversation_id, accountId);
    if (!selected) return NextResponse.json({ error: "Conversation is not available to this connected account." }, { status: 404 });
    const { conversation, recipient } = selected;
    const stored = await supabaseRequest<StoredConversation[]>(`sales_conversations?app_id=eq.sales_copilot&instagram_conversation_id=eq.${encodeURIComponent(conversation.id)}&select=id,instagram_conversation_id`);
    if (!stored[0]) return NextResponse.json({ error: "Sync this conversation before replying." }, { status: 409 });
    const inbound = await supabaseRequest<StoredMessage[]>(`sales_messages?app_id=eq.sales_copilot&conversation_id=eq.${encodeURIComponent(stored[0].id)}&direction=eq.inbound&select=sent_at,direction&order=sent_at.desc&limit=1`);
    if (!withinStandardMessagingWindow(inbound[0]?.sent_at ?? null)) return NextResponse.json({ error: "The standard 24-hour messaging window is closed. Reply in Instagram instead." }, { status: 409 });
    const result = await sendInstagramReply(connection.access_token, accountId, recipient.id, message);
    const saved = await supabaseRequest<{ id: string }[]>("sales_messages", { method: "POST", body: JSON.stringify(outboundMessageRecord(stored[0].id, result.message_id, message, new Date().toISOString())) });
    return NextResponse.json({ sent: true, message_id: result.message_id, saved_message_id: saved[0]?.id });
  } catch (error) {
    return NextResponse.json({ error: safeMetaMessage(error) }, { status: 502 });
  }
}
