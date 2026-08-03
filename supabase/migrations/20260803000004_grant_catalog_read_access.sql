-- Expose the catalog tables required by the authenticated Subject List and
-- official-record program controls. RLS still limits writes to admins.

revoke all on table public.programs, public.subjects from public, anon;
grant select, insert, update, delete on table public.programs, public.subjects to authenticated;
grant select, insert, update, delete on table public.programs, public.subjects to service_role;
