export function getInstagramOAuthUrl(state: string) {
  const params = new URLSearchParams({ client_id: process.env.META_APP_ID ?? "", redirect_uri: process.env.META_REDIRECT_URI ?? "", response_type: "code", state, scope: "instagram_basic,instagram_manage_messages" });
  return `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
}
