-- Allow Meta conversations to be retained when no Sales Copilot lead can be matched.
alter table sales_conversations alter column lead_id drop not null;
