import { NextRequest, NextResponse } from "next/server";
import { getInstagramAccount, getConversations, getConversationMessages, getRawConversationDiagnostics, sendInstagramReply } from "@/src/lib/instagram/client";
import { isAdmin, safeMetaMessage, sameOrigin } from "@/src/lib/instagram/admin";
import { getConnection, saveMetaError } from "@/src/lib/instagram/repository";
import { syncConversations } from "@/src/lib/instagram/sync";

async function run(request: NextRequest, write: boolean) {
  if (!isAdmin(request) || (write && !sameOrigin(request))) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  const action = request.nextUrl.searchParams.get("action");
  try {
    const connection = await getConnection();
    if (!connection) return NextResponse.json({ error: "Instagram is not connected." }, { status: 409 });
    const token = connection.access_token;
    if (action === "account" && !write) return NextResponse.json(await getInstagramAccount(token));
    if (action === "permissions" && !write) {
      const scopes = connection.scopes ?? [];
      return NextResponse.json({ source: "oauth_token_exchange", permissions_endpoint_supported: false, data: scopes.map(permission => ({ permission, status: "granted" })) });
    }
    if (action === "raw_conversations" && !write) return NextResponse.json(await getRawConversationDiagnostics(token, connection.instagram_user_id));
    const account = action === "conversations" || action === "messages" || action === "reply" ? await getInstagramAccount(token) : null;
    const instagramAccountId = account?.user_id ?? connection.instagram_user_id;
    if (action === "conversations" && !write) { const data = await getConversations(token, instagramAccountId); return NextResponse.json({ count: data.data.length, conversations: data.data }); }
    if (action === "messages" && !write) {
      const conversationId = request.nextUrl.searchParams.get("conversation_id") || "";
      const conversations = await getConversations(token, instagramAccountId);
      if (!conversations.data.some(c => c.id === conversationId)) return NextResponse.json({ error: "Conversation is not available to this account." }, { status: 404 });
      return NextResponse.json(await getConversationMessages(token, conversationId));
    }
    if (action === "sync" && write) return NextResponse.json(await syncConversations(connection));
    if (action === "reply" && write) {
      const body = await request.json() as { conversation_id?: string; message?: string };
      const message = body.message?.trim() ?? "";
      if (!message || message.length > 1000) return NextResponse.json({ error: "Reply must be 1–1000 characters." }, { status: 400 });
      if (!(connection.scopes ?? []).includes("instagram_business_manage_messages")) return NextResponse.json({ error: "Missing instagram_business_manage_messages permission." }, { status: 403 });
      const conversations = await getConversations(token, instagramAccountId);
      const conversation = conversations.data.find(c => c.id === body.conversation_id);
      const recipient = conversation?.participants?.data?.find(p => p.id !== instagramAccountId);
      if (!recipient?.id) return NextResponse.json({ error: "No API-supported recipient found in this conversation." }, { status: 409 });
      return NextResponse.json(await sendInstagramReply(token, instagramAccountId, recipient.id, message));
    }
    return NextResponse.json({ error: "Unsupported diagnostic action." }, { status: 400 });
  } catch (error) {
    const message = safeMetaMessage(error);
    await saveMetaError(message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
export async function GET(request: NextRequest) { return run(request, false); }
export async function POST(request: NextRequest) { return run(request, true); }
