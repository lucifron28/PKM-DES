-- Profile-owned saved signature specimens.
-- A specimen is a convenience source only. Signing workflows always copy its
-- bytes into a new enrollment-signatures object and create a new immutable row.

create table if not exists public.signature_specimens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  signature_storage_path text not null,
  signature_hash text not null check (signature_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint signature_specimens_storage_path_key unique (signature_storage_path),
  constraint signature_specimens_storage_path_check check (
    signature_storage_path = profile_id::text || '/' || id::text || '.png'
  )
);

create unique index if not exists signature_specimens_one_current_per_profile_idx
  on public.signature_specimens (profile_id)
  where retired_at is null;

create index if not exists signature_specimens_profile_history_idx
  on public.signature_specimens (profile_id, created_at desc);

create or replace function private.prevent_signature_specimen_mutation()
returns trigger
language plpgsql
as $$
begin
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

drop trigger if exists prevent_signature_specimen_mutation on public.signature_specimens;
create trigger prevent_signature_specimen_mutation
before update or delete on public.signature_specimens
for each row execute function private.prevent_signature_specimen_mutation();

alter table public.signature_specimens enable row level security;
revoke all on table public.signature_specimens from public, anon, authenticated;
grant select on table public.signature_specimens to authenticated;
grant all on table public.signature_specimens to service_role;

drop policy if exists "signature_specimens_select_own" on public.signature_specimens;
create policy "signature_specimens_select_own"
on public.signature_specimens for select
to authenticated
using (profile_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'signature-specimens',
  'signature-specimens',
  false,
  262144,
  array['image/png']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "signature_specimen_objects_select_owner" on storage.objects;
create policy "signature_specimen_objects_select_owner"
on storage.objects for select
to authenticated
using (
  bucket_id = 'signature-specimens'
  and split_part(name, '/', 1) = auth.uid()::text
);

create or replace function public.save_signature_specimen(
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text
)
returns table (outcome text, specimen_id uuid)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_specimen_id uuid;
begin
  if auth.uid() is null
     or not exists (
       select 1 from public.profiles
       where id = auth.uid() and account_status = 'ACTIVE'
     ) then
    return query select 'unauthorized'::text, null::uuid;
    return;
  end if;

  if p_signature_id is null
     or p_signature_storage_path is null
     or p_signature_storage_path <> auth.uid()::text || '/' || p_signature_id::text || '.png'
     or p_signature_hash is null
     or p_signature_hash !~ '^[0-9a-f]{64}$' then
    return query select 'invalid_request'::text, null::uuid;
    return;
  end if;

  update public.signature_specimens
  set retired_at = now()
  where profile_id = auth.uid()
    and retired_at is null;

  insert into public.signature_specimens (
    id, profile_id, signature_storage_path, signature_hash
  )
  values (
    p_signature_id, auth.uid(), p_signature_storage_path, p_signature_hash
  )
  returning id into v_specimen_id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'SAVE_SIGNATURE_SPECIMEN', 'signature_specimens', v_specimen_id);

  return query select 'saved'::text, v_specimen_id;
exception
  when unique_violation then
    return query select 'conflict'::text, null::uuid;
end;
$$;

revoke all on function public.save_signature_specimen(uuid, text, text) from public;
revoke execute on function public.save_signature_specimen(uuid, text, text) from anon;
grant execute on function public.save_signature_specimen(uuid, text, text) to authenticated;

create or replace function public.retire_signature_specimen(p_signature_id uuid)
returns table (outcome text, signature_storage_path text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_specimen public.signature_specimens%rowtype;
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::text;
    return;
  end if;

  select * into v_specimen
  from public.signature_specimens
  where id = p_signature_id
    and profile_id = auth.uid()
    and retired_at is null
  for update;

  if not found then
    return query select 'not_found'::text, null::text;
    return;
  end if;

  update public.signature_specimens
  set retired_at = now()
  where id = v_specimen.id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'RETIRE_SIGNATURE_SPECIMEN', 'signature_specimens', v_specimen.id);

  return query select 'retired'::text, v_specimen.signature_storage_path;
end;
$$;

revoke all on function public.retire_signature_specimen(uuid) from public;
revoke execute on function public.retire_signature_specimen(uuid) from anon;
grant execute on function public.retire_signature_specimen(uuid) to authenticated;
