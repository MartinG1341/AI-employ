create table if not exists sales_ai_style_profiles (
  id uuid primary key default gen_random_uuid(),
  app_id text not null unique,
  profile jsonb not null default '{}'::jsonb,
  sample_count integer not null default 0,
  confidence numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists sales_ai_style_observations (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  source_key text not null,
  source_message_id uuid references sales_messages(id) on delete set null,
  source_variant_id uuid references sales_ai_message_variants(id) on delete set null,
  observation_type text not null,
  observation_value text not null,
  confidence numeric not null default 0.5,
  strategy_metadata jsonb,
  created_at timestamptz not null default now(),
  unique (app_id, source_key)
);

create index if not exists sales_ai_style_observations_type_idx on sales_ai_style_observations(app_id, observation_type, created_at desc);
alter table sales_ai_style_profiles enable row level security;
alter table sales_ai_style_observations enable row level security;
