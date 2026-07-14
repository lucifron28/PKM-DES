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
-- 3. Replace the placeholders below, then run this SQL.

insert into public.profiles (
  id,
  role,
  first_name,
  last_name,
  email,
  account_status
)
values (
  '<auth-user-uuid>',
  'admin',
  '<registrar-first-name>',
  '<registrar-last-name>',
  '<registrar-email>',
  'ACTIVE'
)
on conflict (id) do update
set
  role = excluded.role,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  email = excluded.email,
  account_status = excluded.account_status,
  updated_at = now();

select
  id,
  role,
  first_name,
  last_name,
  email,
  account_status
from public.profiles
where email = '<registrar-email>';
