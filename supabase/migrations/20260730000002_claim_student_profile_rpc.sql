-- Atomic RPC function for explicit student profile linkage
create or replace function public.claim_student_profile(
  p_student_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_target_student record;
  v_existing_claim record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'unauthenticated');
  end if;

  -- Caller must be claiming for themselves or be an admin
  if v_caller_id != p_profile_id and not private.is_admin() then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  -- Lock target student record for update
  select * into v_target_student
  from public.students
  where id = p_student_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'student_not_found');
  end if;

  -- Check if target student record is already linked to a different profile
  if v_target_student.profile_id is not null and v_target_student.profile_id != p_profile_id then
    return jsonb_build_object('success', false, 'error', 'already_claimed');
  end if;

  -- Check if target profile is already linked to another student record
  select * into v_existing_claim
  from public.students
  where profile_id = p_profile_id and id != p_student_id;

  if found then
    return jsonb_build_object('success', false, 'error', 'caller_already_linked');
  end if;

  -- Atomic update
  update public.students
  set profile_id = p_profile_id,
      updated_at = now()
  where id = p_student_id;

  return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.claim_student_profile(uuid, uuid) to authenticated;
