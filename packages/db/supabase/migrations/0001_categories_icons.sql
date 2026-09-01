alter table public.categories alter column icon set default 'tag';
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.ai_messages;
