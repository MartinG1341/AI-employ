create table if not exists sales_business_profile (
  id uuid primary key default gen_random_uuid(), app_id text not null unique,
  business_name text, business_description text, offer_summary text, primary_cta text,
  default_language text not null default 'bg', default_currency text,
  supported_platforms jsonb not null default '[]'::jsonb, general_rules jsonb not null default '{"auto_reply_enabled":false,"neverNegotiateAutomatically":true,"bookingRequiresApproval":true}'::jsonb,
  updated_at timestamptz not null default now()
);
create table if not exists sales_business_knowledge (
  id uuid primary key default gen_random_uuid(), app_id text not null,
  category text not null, key text not null, title text not null, value jsonb not null,
  status text not null default 'UNVERIFIED' check (status in ('VERIFIED','UNVERIFIED','DISABLED')),
  confidence numeric not null default 0.4, source text not null default 'manual', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(app_id, category, key)
);
create index if not exists sales_business_knowledge_lookup_idx on sales_business_knowledge(app_id, status, category, key);
alter table sales_business_profile enable row level security;
alter table sales_business_knowledge enable row level security;
insert into sales_business_profile (app_id) values ('sales_copilot') on conflict (app_id) do nothing;
