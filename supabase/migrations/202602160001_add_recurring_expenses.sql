alter table public.expenses
  add column if not exists recurrence text not null default 'none',
  add column if not exists recurrence_end_date date,
  add column if not exists paid_months jsonb not null default '[]'::jsonb;

update public.expenses
set recurrence = 'none'
where recurrence is null;

update public.expenses
set paid_months = '[]'::jsonb
where paid_months is null or jsonb_typeof(paid_months) <> 'array';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_recurrence_check'
  ) then
    alter table public.expenses
      add constraint expenses_recurrence_check
      check (recurrence in ('none', 'monthly'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'expenses_paid_months_array_check'
  ) then
    alter table public.expenses
      add constraint expenses_paid_months_array_check
      check (jsonb_typeof(paid_months) = 'array');
  end if;
end;
$$;

create index if not exists idx_expenses_user_recurrence
on public.expenses(user_id, recurrence);
