import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { conversationRecipient, outboundMessageRecord, validMetaSignature, validOAuthState, withinStandardMessagingWindow } from "../src/lib/instagram/security";

test("OAuth state must be present and an exact match", () => {
  assert.equal(validOAuthState("expected", "expected"), true);
  assert.equal(validOAuthState("expected", "changed"), false);
  assert.equal(validOAuthState("", ""), false);
});

test("reply recipient must belong to the selected connected-account conversation", () => {
  const conversations = [{ id: "owned", participants: { data: [{ id: "account" }, { id: "recipient" }] } }];
  assert.equal(conversationRecipient(conversations, "other", "account"), null);
  assert.equal(conversationRecipient(conversations, "owned", "account")?.recipient.id, "recipient");
});

test("saved outbound replies retain the Meta ID and conversation", () => {
  assert.deepEqual(outboundMessageRecord("conversation", "mid", "Approved reply", "2026-10-02T12:00:00Z"), {
    app_id: "sales_copilot", conversation_id: "conversation", instagram_message_id: "mid", direction: "outbound", body: "Approved reply", sent_at: "2026-10-02T12:00:00Z",
  });
});

test("Meta signature verifies the unmodified raw body", () => {
  const raw = JSON.stringify({ object: "instagram" });
  const signature = `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`;
  assert.equal(validMetaSignature(raw, signature, "secret"), true);
  assert.equal(validMetaSignature(`${raw} `, signature, "secret"), false);
});

test("standard messaging window requires a recent inbound message", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(withinStandardMessagingWindow("2026-10-01T12:00:01Z", now), true);
  assert.equal(withinStandardMessagingWindow("2026-10-01T11:59:59Z", now), false);
  assert.equal(withinStandardMessagingWindow(null, now), false);
});
