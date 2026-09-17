# Shared Supabase project

Sales Copilot shares a Supabase project with Olfazeta Luxury but owns only the `sales_*` tables created by its migration. Sales Copilot must not query, rename, or modify Olfazeta tables.

The current server API uses `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS. Isolation therefore depends on the explicit `sales_*` repository queries as well as RLS being enabled with no public policies. `app_id` is defense-in-depth; `owner_id` is reserved for future auth-aware RLS policies.
