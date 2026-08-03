-- Configuration tooling uses the service role for serialized standard-load
-- writes. Student-facing reads and RLS policies remain unchanged.

grant insert, update, delete
on table public.standard_load_sets
to service_role;
