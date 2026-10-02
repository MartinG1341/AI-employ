import { NextRequest, NextResponse } from "next/server";
import { getInstagramAccount, getConversations, getConversationMessages, getRawConversationDiagnostics } from "@/src/lib/instagram/client";
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
    const account = action === "conversations" || action === "messages" ? await getInstagramAccount(token) : null;
    const instagramAccountId = account?.user_id ?? connection.instagram_user_id;
    if (action === "conversations" && !write) { const data = await getConversations(token, instagramAccountId); return NextResponse.json({ count: data.data.length, conversations: data.data }); }
    if (action === "messages" && !write) {
      const conversationId = request.nextUrl.searchParams.get("conversation_id") || "";
      const conversations = await getConversations(token, instagramAccountId);
      if (!conversations.data.some(c => c.id === conversationId)) return NextResponse.json({ error: "Conversation is not available to this account." }, { status: 404 });
      return NextResponse.json(await getConversationMessages(token, conversationId));
    }
    if (action === "sync" && write) return NextResponse.json(await syncConversations(connection));
    return NextResponse.json({ error: "Unsupported diagnostic action." }, { status: 400 });
  } catch (error) {
    const message = safeMetaMessage(error);
    await saveMetaError(message).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
export async function GET(request: NextRequest) { return run(request, false); }
export async function POST(request: NextRequest) { return run(request, true); }
