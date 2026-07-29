-- Complete only an authenticated student's existing SETUP account.
-- Auth password updates and profile activation are separate Supabase services;
-- callers retry this idempotent transition when the profile step is unavailable.

create or replace function public.complete_student_account_setup()
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text;
    return;
  end if;

  update public.profiles
  set account_status = 'ACTIVE'
  where id = auth.uid()
    and role = 'student'
    and account_status = 'SETUP';

  if found then
    return query select 'completed'::text;
    return;
  end if;

  return query select 'invalid_setup'::text;
end;
$$;

revoke all on function public.complete_student_account_setup() from public;
revoke execute on function public.complete_student_account_setup() from anon;
grant execute on function public.complete_student_account_setup() to authenticated;
