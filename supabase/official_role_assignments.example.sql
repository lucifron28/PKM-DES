-- Example only. Replace the UUID placeholders with existing ACTIVE admin
-- profile/program IDs in an authorized deployment workflow. Do not expose this
-- as a browser form and do not commit real institutional identities here.

-- Global Nurse assignment:
-- insert into public.official_role_assignments (profile_id, official_role)
-- values ('<active-admin-profile-uuid>', 'NURSE');

-- Program-scoped Program Chair assignment:
-- insert into public.official_role_assignments (profile_id, official_role, program_id)
-- values ('<active-admin-profile-uuid>', 'PROGRAM_CHAIR', '<program-uuid>');

-- Other supported roles are LIBRARIAN, ACCOUNTANT, and DEAN. A null
-- program_id is global; a non-null program_id is enforced by the signing RPC.
