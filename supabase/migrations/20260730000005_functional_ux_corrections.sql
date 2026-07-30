-- Function to release setup email delivery reservation on provider failure or safe retry
create or replace function public.release_student_setup_email_delivery(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  update public.profiles
  set account_setup_email_sent_at = null
  where id = p_profile_id
    and role = 'student'
    and account_status = 'SETUP';
end;
$$;

revoke all on function public.release_student_setup_email_delivery(uuid) from public;
revoke execute on function public.release_student_setup_email_delivery(uuid) from anon;
revoke execute on function public.release_student_setup_email_delivery(uuid) from authenticated;
grant execute on function public.release_student_setup_email_delivery(uuid) to service_role;
