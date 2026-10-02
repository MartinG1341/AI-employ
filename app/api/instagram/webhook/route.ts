import { NextRequest, NextResponse } from "next/server";
import { claimWebhookEvent } from "@/src/lib/instagram/repository";
import { getUsableConnection } from "@/src/lib/instagram/connection";
import { syncConversations } from "@/src/lib/instagram/sync";
import { validMetaSignature } from "@/src/lib/instagram/security";

function config() {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!secret || !verifyToken) throw new Error("Instagram webhook configuration is missing.");
  return { secret, verifyToken };
}

export async function GET(request: NextRequest) {
  try {
    const { verifyToken } = config();
    const mode = request.nextUrl.searchParams.get("hub.mode");
    const token = request.nextUrl.searchParams.get("hub.verify_token");
    const challenge = request.nextUrl.searchParams.get("hub.challenge");
    if (mode !== "subscribe" || token !== verifyToken || !challenge) return new NextResponse("Forbidden", { status: 403 });
    return new NextResponse(challenge, { status: 200 });
  } catch {
    return new NextResponse("Webhook is not configured", { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { secret } = config();
    const raw = await request.text();
    const supplied = request.headers.get("x-hub-signature-256") ?? "";
    if (!validMetaSignature(raw, supplied, secret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    const payload = JSON.parse(raw) as { object?: string; entry?: { id?: string; time?: number; messaging?: { message?: { mid?: string }; timestamp?: number; sender?: { id?: string } }[] }[] };
    if (payload.object !== "instagram") return NextResponse.json({ received: true, ignored: true });
    let accepted = 0;
    for (const entry of payload.entry ?? []) {
      for (const event of entry.messaging ?? []) {
        const eventId = event.message?.mid ?? `${entry.id}:${event.sender?.id}:${event.timestamp ?? entry.time}`;
        if (eventId && await claimWebhookEvent(eventId)) accepted += 1;
      }
    }
    if (accepted) {
      const connection = await getUsableConnection();
      if (connection) await syncConversations(connection);
    }
    return NextResponse.json({ received: true, accepted });
  } catch {
    // A non-2xx response lets Meta retry transient database or sync failures.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
