create table if not exists sales_auto_replies (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot',
  conversation_id uuid references sales_conversations(id) on delete set null,
  inbound_message_id uuid references sales_messages(id) on delete set null,
  outbound_message_id uuid references sales_messages(id) on delete set null,
  decision_mode text, intent text, confidence numeric, generated_text text, knowledge_refs jsonb not null default '[]'::jsonb,
  status text not null check (status in ('eligible','blocked','pending','sent','failed')),
  blocked_reason text, response_source text, dry_run boolean not null default true, sent_at timestamptz, created_at timestamptz not null default now(),
  unique(app_id, inbound_message_id)
);
create index if not exists sales_auto_replies_created_idx on sales_auto_replies(app_id, created_at desc);
alter table sales_auto_replies enable row level security;
update sales_settings set payload = payload || '{"auto_reply_enabled":false,"auto_reply_dry_run":true,"auto_reply_min_confidence":0.95,"allowed_auto_safe_intents":[]}'::jsonb, updated_at = now() where app_id = 'sales_copilot' and kind = 'reply_policy';
