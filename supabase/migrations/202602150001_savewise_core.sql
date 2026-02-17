-- SaveWise core schema
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  balance numeric(14,2) not null default 0,
  interest_rate numeric(5,2) not null default 0,
  compounding_frequency text not null default 'monthly',
  currency text not null default 'USD',
  color text not null default '#0D6E4F',
  icon text not null default 'wallet',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal')),
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount >= 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  deadline date not null,
  wallet_id uuid references public.wallets(id) on delete set null,
  icon text not null default 'flag',
  color text not null default '#0D6E4F',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '',
  date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lender text not null,
  principal numeric(14,2) not null check (principal > 0),
  interest_rate numeric(5,2) not null check (interest_rate >= 0),
  term_months integer not null check (term_months > 0),
  start_date date not null,
  balance numeric(14,2) not null check (balance >= 0),
  color text not null default '#EF4444',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'lifetime')),
  status text not null check (status in ('active', 'inactive', 'canceled', 'expired')),
  source text not null default 'stub',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  lifetime boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_wallets_created_at on public.wallets(created_at desc);
create index if not exists idx_transactions_user_id on public.savings_transactions(user_id);
create index if not exists idx_transactions_wallet_id on public.savings_transactions(wallet_id);
create index if not exists idx_transactions_date on public.savings_transactions(date desc);
create index if not exists idx_goals_user_id on public.savings_goals(user_id);
create index if not exists idx_goals_deadline on public.savings_goals(deadline);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date desc);
create index if not exists idx_incomes_user_id on public.incomes(user_id);
create index if not exists idx_incomes_date on public.incomes(date desc);
create index if not exists idx_loans_user_id on public.loans(user_id);
create index if not exists idx_loan_payments_user_id on public.loan_payments(user_id);
create index if not exists idx_loan_payments_loan_id on public.loan_payments(loan_id);
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);

drop trigger if exists trg_wallets_updated_at on public.wallets;
create trigger trg_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists trg_goals_updated_at on public.savings_goals;
create trigger trg_goals_updated_at
before update on public.savings_goals
for each row execute function public.set_updated_at();

drop trigger if exists trg_loans_updated_at on public.loans;
create trigger trg_loans_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;
alter table public.savings_transactions enable row level security;
alter table public.savings_goals enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "wallets_insert_own" on public.wallets;
create policy "wallets_insert_own" on public.wallets for insert with check (auth.uid() = user_id);
drop policy if exists "wallets_update_own" on public.wallets;
create policy "wallets_update_own" on public.wallets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "wallets_delete_own" on public.wallets;
create policy "wallets_delete_own" on public.wallets for delete using (auth.uid() = user_id);

drop policy if exists "transactions_select_own" on public.savings_transactions;
create policy "transactions_select_own" on public.savings_transactions for select using (auth.uid() = user_id);
drop policy if exists "transactions_insert_own" on public.savings_transactions;
create policy "transactions_insert_own" on public.savings_transactions for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.wallets w
    where w.id = wallet_id and w.user_id = auth.uid()
  )
);
drop policy if exists "transactions_update_own" on public.savings_transactions;
create policy "transactions_update_own" on public.savings_transactions for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.wallets w
    where w.id = wallet_id and w.user_id = auth.uid()
  )
);
drop policy if exists "transactions_delete_own" on public.savings_transactions;
create policy "transactions_delete_own" on public.savings_transactions for delete using (auth.uid() = user_id);

drop policy if exists "goals_select_own" on public.savings_goals;
create policy "goals_select_own" on public.savings_goals for select using (auth.uid() = user_id);
drop policy if exists "goals_insert_own" on public.savings_goals;
create policy "goals_insert_own" on public.savings_goals for insert with check (auth.uid() = user_id);
drop policy if exists "goals_update_own" on public.savings_goals;
create policy "goals_update_own" on public.savings_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "goals_delete_own" on public.savings_goals;
create policy "goals_delete_own" on public.savings_goals for delete using (auth.uid() = user_id);

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses for select using (auth.uid() = user_id);
drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses for insert with check (auth.uid() = user_id);
drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses for delete using (auth.uid() = user_id);

drop policy if exists "incomes_select_own" on public.incomes;
create policy "incomes_select_own" on public.incomes for select using (auth.uid() = user_id);
drop policy if exists "incomes_insert_own" on public.incomes;
create policy "incomes_insert_own" on public.incomes for insert with check (auth.uid() = user_id);
drop policy if exists "incomes_update_own" on public.incomes;
create policy "incomes_update_own" on public.incomes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "incomes_delete_own" on public.incomes;
create policy "incomes_delete_own" on public.incomes for delete using (auth.uid() = user_id);

drop policy if exists "loans_select_own" on public.loans;
create policy "loans_select_own" on public.loans for select using (auth.uid() = user_id);
drop policy if exists "loans_insert_own" on public.loans;
create policy "loans_insert_own" on public.loans for insert with check (auth.uid() = user_id);
drop policy if exists "loans_update_own" on public.loans;
create policy "loans_update_own" on public.loans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "loans_delete_own" on public.loans;
create policy "loans_delete_own" on public.loans for delete using (auth.uid() = user_id);

drop policy if exists "loan_payments_select_own" on public.loan_payments;
create policy "loan_payments_select_own" on public.loan_payments for select using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.loans l
    where l.id = loan_id and l.user_id = auth.uid()
  )
);
drop policy if exists "loan_payments_insert_own" on public.loan_payments;
create policy "loan_payments_insert_own" on public.loan_payments for insert with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.loans l
    where l.id = loan_id and l.user_id = auth.uid()
  )
);
drop policy if exists "loan_payments_update_own" on public.loan_payments;
create policy "loan_payments_update_own" on public.loan_payments for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.loans l
    where l.id = loan_id and l.user_id = auth.uid()
  )
);
drop policy if exists "loan_payments_delete_own" on public.loan_payments;
create policy "loan_payments_delete_own" on public.loan_payments for delete using (auth.uid() = user_id);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid() = user_id);
drop policy if exists "subscriptions_insert_own" on public.subscriptions;
create policy "subscriptions_insert_own" on public.subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "subscriptions_update_own" on public.subscriptions;
create policy "subscriptions_update_own" on public.subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "subscriptions_delete_own" on public.subscriptions;
create policy "subscriptions_delete_own" on public.subscriptions for delete using (auth.uid() = user_id);
