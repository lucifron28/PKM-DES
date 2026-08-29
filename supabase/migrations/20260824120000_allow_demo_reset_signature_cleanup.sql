-- Keep the protected signature-specimen rule in place for normal writes while
-- allowing the explicitly guarded demo reset function to remove demo-only data.

create or replace function private.prevent_signature_specimen_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then
    return old;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Signature specimens are retained as metadata; use the controlled retirement workflow.';
  end if;

  if old.id <> new.id
     or old.profile_id <> new.profile_id
     or old.signature_storage_path <> new.signature_storage_path
     or old.signature_hash <> new.signature_hash
     or old.created_at <> new.created_at
     or old.retired_at is not null
     or new.retired_at is null then
    raise exception 'Signature specimens are immutable; use the controlled retirement workflow.';
  end if;

  return new;
end;
$$;
