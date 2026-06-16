-- PKM-DES Registrar admin profile setup template.
--
-- 1. Create the Auth user first:
--    Supabase Dashboard -> Authentication -> Users -> Add user
--    Email: pkmregistrarofficial@gmail.com
--
-- 2. Copy the created Auth user UUID.
--
-- 3. Replace <auth-user-uuid> below, then run this SQL in the Supabase SQL editor.
--
-- Do not put passwords in this file.
-- The MVP database role value is "admin" for Registrar / authorized enrollment staff.

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
  'Shaira Mae E.',
  'Pajares',
  'pkmregistrarofficial@gmail.com',
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
where email = 'pkmregistrarofficial@gmail.com';
