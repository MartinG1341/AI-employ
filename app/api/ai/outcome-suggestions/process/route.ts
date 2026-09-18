import { NextResponse } from "next/server";
import { supabaseRequest } from "@/src/lib/supabase/server";
import { processInboundReply } from "@/src/lib/learning/reply-linking";
export async function POST(request: Request) {
  try {
    const body = await request.json() as { messageId?: unknown };
    if (typeof body.messageId !== "string") return NextResponse.json({ error: "messageId is required." }, { status: 400 });
    const rows = await supabaseRequest<Array<{ id: string; conversation_id: string; body: string; sent_at: string; direction: "inbound" | "outbound" }>>(`sales_messages?id=eq.${encodeURIComponent(body.messageId)}&app_id=eq.sales_copilot&select=id,conversation_id,body,sent_at,direction`);
    if (!rows[0]) return NextResponse.json({ error: "Message not found." }, { status: 404 });
    return NextResponse.json(await processInboundReply(rows[0]));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process inbound reply." }, { status: 400 }); }
}
