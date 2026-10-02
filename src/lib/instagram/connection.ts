import { refreshInstagramToken } from "./client";
import { getConnection, updateToken, type Connection } from "./repository";

const refreshBeforeMs = 7 * 24 * 60 * 60 * 1000;

export async function getUsableConnection(): Promise<Connection | null> {
  const connection = await getConnection();
  if (!connection?.token_expires_at) return connection;
  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("Instagram access token has expired. Reconnect the account.");
  if (expiresAt - Date.now() > refreshBeforeMs) return connection;
  const refreshed = await refreshInstagramToken(connection.access_token);
  const nextExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await updateToken(connection.id, refreshed.access_token, nextExpiry);
  return { ...connection, access_token: refreshed.access_token, token_expires_at: nextExpiry };
}
