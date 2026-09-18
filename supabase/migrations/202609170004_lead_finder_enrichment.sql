alter table sales_lead_candidates add column if not exists enrichment jsonb not null default '{}'::jsonb;
