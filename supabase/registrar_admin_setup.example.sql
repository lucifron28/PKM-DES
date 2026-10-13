-- PKM-DES Registrar admin profile setup template.
--
-- Replace every placeholder below before running this file.
--
-- 1. Create the Auth user first:
--    Supabase Dashboard -> Authentication -> Users -> Add user
--    Email: <registrar-email>
--
-- 2. Copy the created Auth user UUID.
--
-- 3. Replace the placeholders below, then run this SQL in the Supabase SQL Editor.
--    Registrar accounts require explicit `is_registrar = true` designation;
--    admin profiles default to `is_registrar = false` (fail-closed).

insert into public.profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  account_status,
  is_registrar
)
values (
  '<auth-user-uuid>',
  'admin',
  '<registrar-first-name>',
  '<registrar-last-name>',
  '<registrar-email>',
  'ACTIVE',
  true
)
on conflict (id) do update
set
  role = excluded.role,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  account_status = excluded.account_status,
  is_registrar = excluded.is_registrar,
  updated_at = now();

-- Alternatively, to designate an existing ACTIVE admin profile as Registrar:
-- select private.designate_registrar_profile('<auth-user-uuid>', true);

select
  id,
  role,
  first_name,
  last_name,
  email,
  account_status,
  is_registrar
from public.profiles
where email = '<registrar-email>';
