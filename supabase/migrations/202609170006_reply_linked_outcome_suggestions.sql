alter table sales_messages add column if not exists linked_variant_id uuid references sales_ai_message_variants(id) on delete set null;
alter table sales_messages add column if not exists learning_link_confidence text check (learning_link_confidence in ('high', 'medium', 'low'));
alter table sales_messages add column if not exists learning_link_method text;

create table if not exists sales_ai_outcome_suggestions (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  message_id uuid not null references sales_messages(id) on delete cascade,
  variant_id uuid references sales_ai_message_variants(id) on delete set null,
  suggested_outcomes jsonb not null default '[]'::jsonb,
  overall_confidence numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'modified')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id)
);
create index if not exists sales_ai_outcome_suggestions_status_idx on sales_ai_outcome_suggestions(app_id, status, created_at desc);
create index if not exists sales_ai_outcome_suggestions_variant_idx on sales_ai_outcome_suggestions(variant_id);
alter table sales_ai_outcome_suggestions enable row level security;
