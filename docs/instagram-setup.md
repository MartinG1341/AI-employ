# Instagram connection setup

Sales Copilot uses Meta's Instagram API with Instagram Login for a Professional account. Configure the Instagram product in the Meta app, add the app owner/tester in development mode, and register this exact OAuth redirect URI:

`https://sales-copilot-one.vercel.app/api/instagram/callback`

Set `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, and a strong `SALES_COPILOT_ADMIN_PASSWORD` as Vercel Production environment variables. The admin password protects connection, diagnostics, sync, and manual reply routes. Meta app credentials and Instagram access tokens remain server-side. The current account must grant `instagram_business_basic` and `instagram_business_manage_messages`.

Before using **Sync conversations**, run `supabase/migrations/202609170003_instagram_conversation_sync.sql` in the shared Supabase project. It changes only `sales_conversations.lead_id` to nullable so conversations without a reliable lead match can be stored. No Olfazeta table is touched.

In the app, open Instagram, unlock with the admin password, connect the account, then use diagnostics. Meta messaging requires an existing conversation initiated by the Instagram user; this integration does not initiate cold DMs. Meta may require additional app review or access before non-test conversations are available. Repeated manual sync skips already stored messages by Instagram message ID.
