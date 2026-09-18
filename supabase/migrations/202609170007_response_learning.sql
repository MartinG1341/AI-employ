alter table sales_ai_experiments add column if not exists experiment_type text not null default 'opener' check (experiment_type in ('opener', 'reply'));
alter table sales_ai_experiments add column if not exists inbound_message_id uuid references sales_messages(id) on delete set null;
alter table sales_ai_experiments add column if not exists conversation_id uuid references sales_conversations(id) on delete set null;
alter table sales_ai_message_variants add column if not exists edited_final_text text;

alter table sales_messages add column if not exists reply_decision_mode text check (reply_decision_mode in ('AUTO_SAFE', 'SUGGEST_ONLY', 'HUMAN_REQUIRED'));
alter table sales_messages add column if not exists reply_decision_intent text;
alter table sales_messages add column if not exists reply_decision_confidence numeric;
alter table sales_messages add column if not exists reply_decision_reason text;
alter table sales_messages add column if not exists reply_decision_missing_information jsonb not null default '[]'::jsonb;
alter table sales_messages add column if not exists reply_decision_risk_flags jsonb not null default '[]'::jsonb;

create unique index if not exists sales_ai_reply_experiment_message_unique on sales_ai_experiments(app_id, inbound_message_id) where experiment_type = 'reply' and inbound_message_id is not null;
create index if not exists sales_ai_experiments_type_idx on sales_ai_experiments(app_id, experiment_type, created_at desc);
create index if not exists sales_ai_experiments_conversation_idx on sales_ai_experiments(conversation_id, created_at desc);

insert into sales_settings (app_id, kind, payload)
values ('sales_copilot', 'reply_policy', '{"auto_reply_enabled":false,"allowed_auto_safe_intents":[]}'::jsonb)
on conflict (app_id, kind) do nothing;
