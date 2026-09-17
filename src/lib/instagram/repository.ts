import { supabaseRequest } from "@/src/lib/supabase/server";

export type Connection = { id: string; instagram_user_id: string; username: string; profile: Record<string, unknown> | null; access_token: string; token_expires_at: string | null; scopes: string[] | null; last_error: string | null };
export async function getConnection() {
  const rows = await supabaseRequest<Connection[]>("sales_instagram_connections?app_id=eq.sales_copilot&select=*&order=created_at.desc&limit=1");
  return rows[0] ?? null;
}
export async function saveConnection(data: Omit<Connection, "id" | "last_error">) {
  const existing = await getConnection();
  const payload = { ...data, app_id: "sales_copilot", last_error: null, updated_at: new Date().toISOString() };
  const path = existing ? `sales_instagram_connections?id=eq.${encodeURIComponent(existing.id)}&app_id=eq.sales_copilot` : "sales_instagram_connections";
  const rows = await supabaseRequest<Connection[]>(path, { method: existing ? "PATCH" : "POST", body: JSON.stringify(payload) });
  return rows[0];
}
export async function clearConnection() {
  const existing = await getConnection();
  if (existing) await supabaseRequest<unknown>(`sales_instagram_connections?id=eq.${encodeURIComponent(existing.id)}&app_id=eq.sales_copilot`, { method: "DELETE" });
}
export async function saveMetaError(message: string) {
  const existing = await getConnection();
  if (existing) await supabaseRequest<unknown>(`sales_instagram_connections?id=eq.${encodeURIComponent(existing.id)}&app_id=eq.sales_copilot`, { method: "PATCH", body: JSON.stringify({ last_error: message, updated_at: new Date().toISOString() }) });
}
export function publicConnection(connection: Connection | null) {
  if (!connection) return { connected: false };
  return { connected: true, instagram_user_id: connection.instagram_user_id, username: connection.username, profile: connection.profile, scopes: connection.scopes, token_expires_at: connection.token_expires_at, last_error: connection.last_error };
}
