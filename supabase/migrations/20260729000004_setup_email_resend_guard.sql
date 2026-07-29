-- Reserve setup-link delivery server-side to prevent repeated email sends.

alter table public.profiles
  add column if not exists account_setup_email_sent_at timestamptz;

create or replace function public.reserve_student_setup_email_delivery(p_profile_id uuid)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_profile_id is null then
    return query select 'invalid_account'::text;
    return;
  end if;

  update public.profiles
  set account_setup_email_sent_at = now()
  where id = p_profile_id
    and role = 'student'
    and account_status = 'SETUP'
    and (
      account_setup_email_sent_at is null
      or account_setup_email_sent_at <= now() - interval '5 minutes'
    );

  if found then
    return query select 'reserved'::text;
    return;
  end if;

  if exists (
    select 1
    from public.profiles
    where id = p_profile_id
      and role = 'student'
      and account_status = 'SETUP'
  ) then
    return query select 'cooldown'::text;
    return;
  end if;

  return query select 'invalid_account'::text;
end;
$$;

revoke all on function public.reserve_student_setup_email_delivery(uuid) from public;
revoke execute on function public.reserve_student_setup_email_delivery(uuid) from anon;
revoke execute on function public.reserve_student_setup_email_delivery(uuid) from authenticated;
grant execute on function public.reserve_student_setup_email_delivery(uuid) to service_role;
