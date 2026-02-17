alter table public.subscriptions
  add column if not exists provider text,
  add column if not exists product_id text,
  add column if not exists transaction_id text,
  add column if not exists last_verified_at timestamptz;

update public.subscriptions
set provider = coalesce(provider, source, 'legacy')
where provider is null;

create unique index if not exists idx_subscriptions_transaction_id
on public.subscriptions(transaction_id);

create index if not exists idx_subscriptions_user_status
on public.subscriptions(user_id, status, created_at desc);

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "subscriptions_insert_own" on public.subscriptions;
drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "subscriptions_delete_own" on public.subscriptions;

create or replace function public.upsert_subscription_from_billing(
  p_user_id uuid,
  p_plan text,
  p_status text,
  p_source text,
  p_provider text,
  p_product_id text,
  p_transaction_id text,
  p_started_at timestamptz,
  p_expires_at timestamptz,
  p_lifetime boolean,
  p_last_verified_at timestamptz default now()
)
returns public.subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.subscriptions;
begin
  if p_user_id is null then
    raise exception 'User id is required.';
  end if;
  if p_plan not in ('monthly', 'yearly', 'lifetime') then
    raise exception 'Invalid subscription plan.';
  end if;
  if p_status not in ('active', 'inactive', 'canceled', 'expired') then
    raise exception 'Invalid subscription status.';
  end if;

  if p_transaction_id is not null and length(trim(p_transaction_id)) > 0 then
    insert into public.subscriptions (
      user_id,
      plan,
      status,
      source,
      provider,
      product_id,
      transaction_id,
      started_at,
      expires_at,
      lifetime,
      last_verified_at
    )
    values (
      p_user_id,
      p_plan,
      p_status,
      coalesce(p_source, 'revenuecat'),
      coalesce(p_provider, 'revenuecat'),
      p_product_id,
      p_transaction_id,
      coalesce(p_started_at, now()),
      p_expires_at,
      coalesce(p_lifetime, false),
      coalesce(p_last_verified_at, now())
    )
    on conflict (transaction_id) do update
      set
        user_id = excluded.user_id,
        plan = excluded.plan,
        status = excluded.status,
        source = excluded.source,
        provider = excluded.provider,
        product_id = excluded.product_id,
        started_at = excluded.started_at,
        expires_at = excluded.expires_at,
        lifetime = excluded.lifetime,
        last_verified_at = excluded.last_verified_at,
        updated_at = now()
    returning * into v_row;
  else
    insert into public.subscriptions (
      user_id,
      plan,
      status,
      source,
      provider,
      product_id,
      transaction_id,
      started_at,
      expires_at,
      lifetime,
      last_verified_at
    )
    values (
      p_user_id,
      p_plan,
      p_status,
      coalesce(p_source, 'revenuecat'),
      coalesce(p_provider, 'revenuecat'),
      p_product_id,
      null,
      coalesce(p_started_at, now()),
      p_expires_at,
      coalesce(p_lifetime, false),
      coalesce(p_last_verified_at, now())
    )
    returning * into v_row;
  end if;

  if v_row.status = 'active' then
    update public.subscriptions
    set status = 'expired', updated_at = now()
    where user_id = v_row.user_id
      and id <> v_row.id
      and status = 'active';
  end if;

  return v_row;
end;
$$;

revoke all on function public.upsert_subscription_from_billing(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
) from public;

grant execute on function public.upsert_subscription_from_billing(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  boolean,
  timestamptz
) to service_role;

create or replace function public.create_savings_transaction_atomic(
  p_wallet_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default '',
  p_date timestamptz default now()
)
returns public.savings_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.wallets;
  v_transaction public.savings_transactions;
begin
  if v_user_id is null then
    raise exception 'Unauthorized.';
  end if;
  if p_type not in ('deposit', 'withdrawal') then
    raise exception 'Invalid transaction type.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select *
  into v_wallet
  from public.wallets
  where id = p_wallet_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet not found.';
  end if;

  if p_type = 'withdrawal' and v_wallet.balance < p_amount then
    raise exception 'Insufficient wallet balance.';
  end if;

  update public.wallets
  set balance = case
    when p_type = 'deposit' then balance + p_amount
    else greatest(balance - p_amount, 0)
  end
  where id = v_wallet.id;

  insert into public.savings_transactions (
    user_id,
    wallet_id,
    type,
    amount,
    note,
    date
  )
  values (
    v_user_id,
    p_wallet_id,
    p_type,
    p_amount,
    coalesce(p_note, ''),
    coalesce(p_date, now())
  )
  returning * into v_transaction;

  return v_transaction;
end;
$$;

create or replace function public.delete_savings_transaction_atomic(
  p_transaction_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_transaction public.savings_transactions;
begin
  if v_user_id is null then
    raise exception 'Unauthorized.';
  end if;

  select *
  into v_transaction
  from public.savings_transactions
  where id = p_transaction_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Transaction not found.';
  end if;

  update public.wallets
  set balance = case
    when v_transaction.type = 'deposit' then greatest(balance - v_transaction.amount, 0)
    else balance + v_transaction.amount
  end
  where id = v_transaction.wallet_id
    and user_id = v_user_id;

  delete from public.savings_transactions
  where id = p_transaction_id
    and user_id = v_user_id;
end;
$$;

create or replace function public.create_loan_payment_atomic(
  p_loan_id uuid,
  p_amount numeric,
  p_note text default '',
  p_payment_date date default current_date
)
returns public.loan_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_loan public.loans;
  v_payment public.loan_payments;
begin
  if v_user_id is null then
    raise exception 'Unauthorized.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;

  select *
  into v_loan
  from public.loans
  where id = p_loan_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Loan not found.';
  end if;

  update public.loans
  set balance = greatest(balance - p_amount, 0)
  where id = v_loan.id;

  insert into public.loan_payments (
    user_id,
    loan_id,
    amount,
    payment_date,
    note
  )
  values (
    v_user_id,
    p_loan_id,
    p_amount,
    coalesce(p_payment_date, current_date),
    coalesce(p_note, '')
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

create or replace function public.delete_loan_payment_atomic(
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.loan_payments;
begin
  if v_user_id is null then
    raise exception 'Unauthorized.';
  end if;

  select *
  into v_payment
  from public.loan_payments
  where id = p_payment_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Loan payment not found.';
  end if;

  update public.loans
  set balance = balance + v_payment.amount
  where id = v_payment.loan_id
    and user_id = v_user_id;

  delete from public.loan_payments
  where id = p_payment_id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.create_savings_transaction_atomic(
  uuid,
  text,
  numeric,
  text,
  timestamptz
) from public;
revoke all on function public.delete_savings_transaction_atomic(uuid) from public;
revoke all on function public.create_loan_payment_atomic(
  uuid,
  numeric,
  text,
  date
) from public;
revoke all on function public.delete_loan_payment_atomic(uuid) from public;

grant execute on function public.create_savings_transaction_atomic(
  uuid,
  text,
  numeric,
  text,
  timestamptz
) to authenticated;
grant execute on function public.delete_savings_transaction_atomic(uuid) to authenticated;
grant execute on function public.create_loan_payment_atomic(
  uuid,
  numeric,
  text,
  date
) to authenticated;
grant execute on function public.delete_loan_payment_atomic(uuid) to authenticated;
