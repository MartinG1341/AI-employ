-- Sales Copilot uses a dedicated namespace because this Supabase project is shared
-- with Olfazeta Luxury. This migration creates and references only sales_* tables.
create extension if not exists pgcrypto;

do $$ begin
  create type sales_lead_status as enum ('New','Researching','Ready to contact','Contacted','Replied','Interested','Demo','Won','Lost');
exception when duplicate_object then null;
end $$;

create table if not exists sales_settings (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  kind text not null, payload jsonb not null default '{}', created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (app_id, kind)
);
create table if not exists sales_instagram_connections (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  instagram_user_id text, username text, profile jsonb, access_token text, token_expires_at timestamptz, scopes text[], last_error text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists sales_leads (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  business_name text, instagram_username text not null, instagram_url text, website text, category text, description text, bio text,
  notes text, products_services text, customer_contact_method text, relevance_summary text, research_summary text,
  known_facts jsonb default '[]', ai_inferences jsonb default '[]', status sales_lead_status not null default 'New',
  instagram_conversation_id text, last_contacted_at timestamptz, next_followup_at timestamptz,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists sales_lead_activities (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  lead_id uuid not null references sales_leads(id) on delete cascade, type text not null, content text, metadata jsonb default '{}', created_at timestamptz default now()
);
create table if not exists sales_conversations (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  lead_id uuid not null references sales_leads(id) on delete cascade, instagram_conversation_id text unique, status text, last_synced_at timestamptz, created_at timestamptz default now()
);
create table if not exists sales_messages (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  conversation_id uuid not null references sales_conversations(id) on delete cascade, direction text not null, body text not null, instagram_message_id text unique, sent_at timestamptz default now()
);
create table if not exists sales_followups (
  id uuid primary key default gen_random_uuid(), app_id text not null default 'sales_copilot', owner_id uuid null,
  lead_id uuid not null references sales_leads(id) on delete cascade, due_at timestamptz not null, status text not null default 'open', previous_message text, completed_at timestamptz, created_at timestamptz default now()
);

create unique index if not exists sales_leads_instagram_username_unique on sales_leads (lower(instagram_username));

alter table sales_settings enable row level security;
alter table sales_instagram_connections enable row level security;
alter table sales_leads enable row level security;
alter table sales_lead_activities enable row level security;
alter table sales_conversations enable row level security;
alter table sales_messages enable row level security;
alter table sales_followups enable row level security;
