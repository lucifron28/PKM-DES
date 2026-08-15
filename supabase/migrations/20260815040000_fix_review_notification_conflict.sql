-- Keep existing databases aligned with the corrected review RPC definition.
-- The original conflict target was ambiguous because the RPC exposes an
-- output variable named enrollment_id.
do $$
declare
  v_definition text;
  v_fixed_definition text;
begin
  select pg_get_functiondef(p.oid)
    into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'review_pending_enrollment'
    and p.pronargs = 3;

  if v_definition is null then
    raise exception 'review_pending_enrollment(uuid, text, text) was not found';
  end if;

  if position('on conflict (enrollment_id, decision) do nothing' in v_definition) > 0 then
    v_fixed_definition := replace(
      v_definition,
      'on conflict (enrollment_id, decision) do nothing',
      'on conflict on constraint enrollment_decision_notifications_enrollment_decision_key do nothing'
    );
    execute v_fixed_definition;
  elsif position('on conflict on constraint enrollment_decision_notifications_enrollment_decision_key do nothing' in v_definition) = 0 then
    raise exception 'review_pending_enrollment notification conflict target was not recognized';
  end if;
end;
$$;
