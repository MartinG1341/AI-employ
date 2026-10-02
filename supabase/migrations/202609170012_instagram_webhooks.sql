-- Idempotency ledger for Meta webhook deliveries. Sales Copilot objects only.
create table if not exists sales_instagram_webhook_events (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  event_id text not null,
  received_at timestamptz not null default now(),
  unique (app_id, event_id)
);
create index if not exists sales_instagram_webhook_events_received_idx on sales_instagram_webhook_events(app_id, received_at desc);
alter table sales_instagram_webhook_events enable row level security;
