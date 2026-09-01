-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";

-- 2. TABELAS CORE

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null default 'BRL',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  token text unique not null,
  email text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit', 'investment', 'cash')),
  visibility text not null default 'shared' check (visibility in ('private', 'balance_only', 'shared')),
  institution text,
  currency text not null default 'BRL',
  external_provider text,
  external_item_id text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete cascade,
  name text not null,
  icon text not null default '💰',
  color text not null default '#64748b',
  kind text not null check (kind in ('expense', 'income')),
  budget_style text not null default 'flex' check (budget_style in ('envelope', 'flex', 'fixed')),
  sort_order int not null default 0
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  transfer_to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'BRL',
  date date not null default current_date,
  description text not null,
  merchant text,
  notes text,
  tags text[] not null default '{}',
  receipt_url text,
  split jsonb,
  is_recurring_parent boolean not null default false,
  recurrence_id uuid,
  source text not null default 'manual' check (source in ('manual', 'csv', 'ofx', 'qif', 'pluggy', 'ai', 'ocr')),
  version int not null default 1,
  created_by_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.transaction_history (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  superseded_by_id uuid references public.transactions(id) on delete set null,
  snapshot jsonb not null,
  version int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  template jsonb not null,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  next_run_at timestamptz not null,
  is_active boolean not null default true
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null check (year >= 2024),
  limit_cents bigint not null default 0,
  envelope_cents bigint not null default 0,
  rollover boolean not null default false,
  unique (household_id, category_id, month, year)
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target_cents bigint not null check (target_cents > 0),
  deadline date,
  strategy text
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  principal_cents bigint not null check (principal_cents >= 0),
  apr_bps int not null default 0,
  min_payment_cents bigint not null default 0,
  strategy text check (strategy in ('snowball', 'avalanche'))
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_action_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  message_id uuid references public.ai_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  tool_name text not null,
  params jsonb not null,
  result jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'executed')),
  approved_by_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

-- 3. ÍNDICES DE PERFORMANCE
create index if not exists idx_transactions_household_date on public.transactions(household_id, date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_accounts_household on public.accounts(household_id);
create index if not exists idx_ai_messages_household_created on public.ai_messages(household_id, created_at asc);

-- 4. HELPER SQL FUNCTION auth_household()
create or replace function public.auth_household() returns uuid language sql stable as
$$ select nullif(auth.jwt()->'app_metadata'->>'household_id','')::uuid $$;

-- 5. ROW LEVEL SECURITY POLICIES
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_history enable row level security;
alter table public.recurrences enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.debts enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_action_logs enable row level security;

-- Drop policies if exist to prevent duplicate errors
drop policy if exists households_sel on public.households;
drop policy if exists profiles_sel on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists accounts_sel on public.accounts;
drop policy if exists accounts_write on public.accounts;
drop policy if exists tx_sel on public.transactions;
drop policy if exists tx_write on public.transactions;
drop policy if exists categories_sel on public.categories;
drop policy if exists categories_write on public.categories;
drop policy if exists budgets_all on public.budgets;
drop policy if exists goals_all on public.goals;
drop policy if exists debts_all on public.debts;
drop policy if exists ai_messages_all on public.ai_messages;
drop policy if exists ai_action_logs_all on public.ai_action_logs;

create policy households_sel on public.households for select using (id = auth_household());
create policy profiles_sel on public.profiles for select using (household_id = auth_household());
create policy profiles_update on public.profiles for update using (id = auth.uid());

create policy accounts_sel on public.accounts for select using (
  household_id = auth_household()
  and (owner_id is null or owner_id = auth.uid() or visibility <> 'private')
);
create policy accounts_write on public.accounts for all using (household_id = auth_household());

create policy tx_sel on public.transactions for select using (
  household_id = auth_household() and exists (
    select 1 from public.accounts a where a.id = transactions.account_id
      and (a.owner_id = auth.uid() or a.visibility = 'shared' or a.owner_id is null)
  )
);
create policy tx_write on public.transactions for all using (household_id = auth_household());

create policy categories_sel on public.categories for select using (household_id is null or household_id = auth_household());
create policy categories_write on public.categories for all using (household_id = auth_household());
create policy budgets_all on public.budgets for all using (household_id = auth_household());
create policy goals_all on public.goals for all using (household_id = auth_household());
create policy debts_all on public.debts for all using (household_id = auth_household());
create policy ai_messages_all on public.ai_messages for all using (household_id = auth_household());
create policy ai_action_logs_all on public.ai_action_logs for all using (household_id = auth_household());

-- 6. VIEW DE SALDO CALCULADO
create or replace view public.account_balances with (security_invoker = on) as
select 
  a.id as account_id, 
  a.household_id, 
  a.visibility, 
  a.owner_id,
  coalesce(sum(case
    when t.type = 'income' then t.amount_cents
    when t.type = 'expense' then -t.amount_cents
    when t.type = 'transfer' and t.account_id = a.id then -t.amount_cents
    when t.type = 'transfer' and t.transfer_to_account_id = a.id then t.amount_cents
    else 0 end), 0) as balance_cents
from public.accounts a 
left join public.transactions t
  on t.deleted_at is null 
  and (t.account_id = a.id or t.transfer_to_account_id = a.id)
group by a.id;

-- 7. ONBOARDING TRIGGER E HOOK
create or replace function public.handle_new_user() returns trigger language plpgsql security definer as $$
declare
  v_invite_token text;
  v_invite record;
  v_household_id uuid;
begin
  v_invite_token := new.raw_user_meta_data->>'invite_token';

  if v_invite_token is not null then
    select * into v_invite from public.invites where token = v_invite_token and accepted_at is null and expires_at > now();
    if v_invite.id is not null then
      v_household_id := v_invite.household_id;
      insert into public.profiles (id, household_id, full_name, avatar_url, role)
      values (new.id, v_household_id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url', 'member');
      
      update public.invites set accepted_at = now() where id = v_invite.id;
    else
      raise exception 'Convite inválido ou expirado';
    end if;
  else
    insert into public.households (name)
    values (coalesce(new.raw_user_meta_data->>'household_name', 'Nosso Casa'))
    returning id into v_household_id;

    insert into public.profiles (id, household_id, full_name, avatar_url, role)
    values (new.id, v_household_id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.raw_user_meta_data->>'avatar_url', 'admin');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.custom_access_token_hook(event jsonb) returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  user_household_id uuid;
begin
  select household_id into user_household_id from public.profiles where id = (event->>'user_id')::uuid;
  
  claims := event->'claims';
  if user_household_id is not null then
    claims := jsonb_set(claims, '{app_metadata,household_id}', to_jsonb(user_household_id::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;
