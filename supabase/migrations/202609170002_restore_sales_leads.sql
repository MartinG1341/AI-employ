-- Non-destructive repair for the shared Supabase project.
-- Creates/restores only Sales Copilot objects; Olfazeta tables are untouched.
do $$ begin
  create type sales_lead_status as enum ('New','Researching','Ready to contact','Contacted','Replied','Interested','Demo','Won','Lost');
exception when duplicate_object then null;
end $$;

create table if not exists sales_leads (
  id uuid primary key default gen_random_uuid(),
  app_id text not null default 'sales_copilot',
  owner_id uuid null,
  business_name text,
  instagram_username text not null,
  instagram_url text,
  website text,
  category text,
  description text,
  bio text,
  notes text,
  products_services text,
  customer_contact_method text,
  relevance_summary text,
  research_summary text,
  known_facts jsonb default '[]',
  ai_inferences jsonb default '[]',
  status sales_lead_status not null default 'New',
  instagram_conversation_id text,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists sales_leads_instagram_username_unique on sales_leads (lower(instagram_username));
alter table sales_leads enable row level security;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sales_lead_activities_lead_id_fkey') then
    alter table sales_lead_activities add constraint sales_lead_activities_lead_id_fkey foreign key (lead_id) references sales_leads(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_conversations_lead_id_fkey') then
    alter table sales_conversations add constraint sales_conversations_lead_id_fkey foreign key (lead_id) references sales_leads(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sales_followups_lead_id_fkey') then
    alter table sales_followups add constraint sales_followups_lead_id_fkey foreign key (lead_id) references sales_leads(id) on delete cascade;
  end if;
end $$;
