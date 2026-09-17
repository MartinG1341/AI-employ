-- Lead Finder owns only sales_* tables in the shared Supabase project.
create table if not exists sales_lead_search_sessions (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot',
  query text not null, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists sales_lead_search_messages (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot',
  session_id uuid not null references sales_lead_search_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')), content text not null, created_at timestamptz default now()
);
create table if not exists sales_lead_candidates (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot',
  session_id uuid not null references sales_lead_search_sessions(id) on delete cascade,
  business_name text not null, platform text, username text, profile_url text, website text,
  location text, category text, short_description text, why_relevant text, public_contact_method text,
  source_urls jsonb not null default '[]', confidence numeric, created_at timestamptz default now()
);
create index if not exists sales_lead_search_messages_session_idx on sales_lead_search_messages(session_id, created_at);
create index if not exists sales_lead_candidates_session_idx on sales_lead_candidates(session_id, created_at);
alter table sales_lead_search_sessions enable row level security;
alter table sales_lead_search_messages enable row level security;
alter table sales_lead_candidates enable row level security;
