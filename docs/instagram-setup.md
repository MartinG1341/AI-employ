# Instagram connection setup

Sales Copilot uses Meta's **Instagram API with Instagram Login** for a Professional account. It never initiates a cold DM: a person must first message the connected professional account. Every outbound message in the inbox requires a user confirmation; AI AUTO_SAFE remains evaluation/draft-only.

## Local development

1. Use Node 22.13 or newer and run `npm install` (or `npm run install:ci`).
2. Copy `.env.example` to `.env.local` and fill the server environment variables. Never commit that file.
3. Apply the migrations listed below to a development Supabase project, not the shared production project.
4. Run `npm run dev` and open the URL printed by the framework.

Required Instagram variables are `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `META_REDIRECT_URI`, `META_WEBHOOK_VERIFY_TOKEN`, and `SALES_COPILOT_ADMIN_PASSWORD`. Supabase requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`. The app secret, webhook token, service-role key, Instagram access token, and admin password must exist only in server/hosting environment configuration.

The app-wide signed session protects data API routes. Unlocking Instagram establishes that HTTP-only, same-site session. ChatGPT-specific request headers are not treated as Vercel authentication. State-changing API requests additionally require a same-origin browser request.

## Meta configuration

In a Meta app configured for **Instagram API with Instagram Login**, register the exact callback from `META_REDIRECT_URI` (production currently uses `https://sales-copilot-one.vercel.app/api/instagram/callback`). Configure the callback `/api/instagram/webhook`, enter the same random verification value as `META_WEBHOOK_VERIFY_TOKEN`, subscribe the Instagram account to message events, and keep the app secret server-side.

The authorization requests `instagram_business_basic` and `instagram_business_manage_messages`. The callback validates a short-lived, HTTP-only OAuth state and stores the ID returned by the connected Instagram professional account. Verify that the app/product, redirect URI, connected professional account ID, and webhook subscription all belong together. Test users may be required while the Meta app is in development mode; production users require the appropriate Meta review/access.

Incoming webhook POST bodies are checked using `X-Hub-Signature-256`, recorded in an idempotency ledger, and then synced. Manual **Sync now** remains available as recovery. Long-lived tokens are refreshed when within seven days of expiry; an expired token produces a reconnect instruction.

Meta's standard messaging window is enforced from the most recent stored inbound message. The app does not expose arbitrary-recipient sending. Sync the conversation first, select it in the inbox, write a reply, and explicitly confirm sending. Meta API errors are sanitized and shown to the operator.

> Re-check Meta's official Instagram Platform documentation before production review. API versions, review requirements, and messaging eligibility can change. No live Meta calls were made during development.

## Migration order and shared-project safety

Do **not** run a destructive reset. The Supabase project is shared with Olfazeta; these migrations touch only `sales_*` objects. Apply in filename order:

1. `202609170001_sales_copilot.sql`
2. `202609170002_restore_sales_leads.sql`
3. `202609170003_lead_finder.sql`
4. `202609170004_lead_finder_enrichment.sql`
5. `202609170005_outcome_learning.sql`
6. `202609170006_reply_linked_outcome_suggestions.sql`
7. `202609170007_response_learning.sql`
8. `202609170008_personal_style_learning.sql`
9. `202609170009_business_knowledge.sql`
10. `202609170010_controlled_auto_replies.sql`
11. `202609170011_instagram_conversation_sync.sql` (depends on `sales_conversations` from 001)
12. `202609170012_instagram_webhooks.sql`

The former duplicate `202609170003_instagram_conversation_sync.sql` is now migration 011. Migration 002 is an idempotent repair for the base leads table; retain its place for existing deployments.
