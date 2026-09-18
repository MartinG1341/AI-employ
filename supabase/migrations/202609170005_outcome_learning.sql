create table if not exists sales_ai_experiments (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  lead_id uuid not null references sales_leads(id) on delete cascade,
  objective text not null,
  status text not null default 'active',
  recommended_variant_id uuid null,
  selected_variant_id uuid null,
  created_at timestamptz not null default now()
);

create table if not exists sales_ai_message_variants (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  experiment_id uuid not null references sales_ai_experiments(id) on delete cascade,
  variant_key text not null,
  message text not null,
  strategy_metadata jsonb not null default '{}',
  selected boolean not null default false,
  sent boolean not null default false,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (experiment_id, variant_key)
);

alter table sales_ai_experiments
  add constraint sales_ai_experiments_recommended_variant_fk
  foreign key (recommended_variant_id) references sales_ai_message_variants(id) on delete set null;

alter table sales_ai_experiments
  add constraint sales_ai_experiments_selected_variant_fk
  foreign key (selected_variant_id) references sales_ai_message_variants(id) on delete set null;

create table if not exists sales_ai_outcomes (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  variant_id uuid not null references sales_ai_message_variants(id) on delete cascade,
  outcome_type text not null,
  source text not null default 'manual',
  metadata jsonb not null default '{}',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (variant_id, idempotency_key)
);

create index if not exists sales_ai_experiments_lead_idx on sales_ai_experiments(lead_id, created_at desc);
create index if not exists sales_ai_variants_experiment_idx on sales_ai_message_variants(experiment_id, created_at);
create index if not exists sales_ai_outcomes_variant_idx on sales_ai_outcomes(variant_id, created_at);

alter table sales_ai_experiments enable row level security;
alter table sales_ai_message_variants enable row level security;
alter table sales_ai_outcomes enable row level security;
