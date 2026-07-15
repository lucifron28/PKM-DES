# Private Preview Credentials

## Purpose

This local-only workflow prepares unique passwords for the three fictional student accounts used in the PKM-DES research MVP demo. It also verifies the existing internal Registrar/Admin account without creating, changing, or exposing that account.

It is for authorized presenters using a confirmed safe Supabase preview project. It is not an institutional account-provisioning process, email-delivery workflow, or production credential-management system.

## Safety Boundary

- Credentials, Auth UUIDs, and credential manifests must be supplied and distributed privately.
- The generated manifest is written only to the ignored `.preview/` directory.
- Never commit `.preview/`, `.env`, `.env.local`, screenshots, terminal logs, passwords, tokens, or the internal Registrar identity.
- The tooling accepts only an HTTPS Supabase URL whose host exactly matches `PREVIEW_EXPECTED_SUPABASE_HOST` and ends in `.supabase.co`.
- It changes only the password of the three allowlisted fictional account-backed demo students. The claim-only official record is never given an Auth account by this tooling.
- Use a dedicated preview or test project. Do not run `--apply` against a project containing institutional or unrelated data.
- Before any password is generated or changed, the command validates both ignored manifest destinations, requires existing destinations to be regular files, rejects symlinked or unsupported filesystem objects, and performs a secret-free write/rename/delete probe. It stops if either manifest already exists unless `--overwrite` is explicitly supplied.

## Required Local Environment

Copy the placeholders from `.env.example` into an ignored local environment file. The preview tooling requires:

```text
NEXT_PUBLIC_SUPABASE_URL=<preview-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<preview-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<preview-service-role-key>
PREVIEW_EXPECTED_SUPABASE_HOST=<preview-project-ref>.supabase.co
PREVIEW_REGISTRAR_EMAIL=<provided privately>
PREVIEW_REGISTRAR_PASSWORD=<provided privately>
```

For an intentional password update, also set:

```text
PREVIEW_CREDENTIALS_CONFIRM=PREPARE_PKM_DES_PREVIEW_CREDENTIALS
```

`PREVIEW_CREDENTIALS_CONFIRM` is required only with `--apply`.

## Required Demo State

Run the guarded demo reset and verification only on a dedicated preview/test project before preparing credentials:

```bash
npm run demo:reset
npm run demo:verify
```

The prepare command stops before changing any student password unless it confirms all of the following:

1. Each account-backed fictional demo email resolves to exactly one Supabase Auth user.
2. Each Auth user maps to exactly one active student profile and the matching fictional Student ID.
3. The claim-only record has exactly one official student record and no Auth user, profile, or student row.
4. The Registrar/Admin credential can sign in, maps to the preflighted Auth user, and has an active admin profile.

## Prepare and Verify

Start with the non-mutating dry run:

```bash
npm run preview:credentials:prepare
```

The dry run verifies the target and the existing Registrar/Admin account, but creates no manifest and changes no password.

After confirming the safe target and setting the explicit confirmation value, prepare the private set:

```bash
npm run preview:credentials:prepare -- --apply
```

This writes `.preview/preview-credentials.local.json` with restrictive POSIX permissions when the operating system supports them. Windows ACL behavior varies, so presenters must still protect the local device and remove the file after use.

Both `.preview/preview-credentials.local.json` and `.preview/preview-credentials.partial.local.json` are protected destinations. Existing paths must be regular files. If either exists, preparation stops before changing an Auth password unless `--overwrite` is supplied. In overwrite mode, the command tests a same-directory replacement of secret-free probe files before rotation; unsupported replacement behavior stops the operation before mutation.

If any step fails after one or more student passwords were changed, the command stops with a nonzero exit code and writes only the successfully changed credentials to `.preview/preview-credentials.partial.local.json`. It then invalidates the complete manifest so verification cannot use a stale credential set. Resolve the failure privately, then intentionally rerun with `--overwrite` only when replacing the local recovery manifest is appropriate. If no password was changed, no recovery manifest is written.

A partial recovery manifest blocks normal verification. If both manifest files exist, the complete file is treated as potentially stale and verification refuses to sign in. The verifier never deletes either file. Successful recovery reports only the approved relative recovery path, `.preview/preview-credentials.partial.local.json`; resolve the recovery state and rerun preparation intentionally.

After complete success, the command removes a stale partial manifest only after the complete manifest is stored safely.

Verify the private manifest before presenting:

```bash
npm run preview:credentials:verify
```

Verification requires the Registrar email and password in the manifest to exactly match the local Registrar environment credentials (email is normalized; password characters are preserved). It also checks every student account, demo state, Student ID, and the claim-only email, Student ID, student type, live-claim password presence, and pre-claim state against the committed fictional demo records. It signs in the Registrar/Admin and each fictional student separately, checks role and active status, verifies the student identity pair, confirms the claim-only record has no Auth user, profile, student, or enrollment associated with its reserved Student ID, signs out every test session, and scans tracked files for prepared secret values. It does not update passwords, profiles, records, or enrollment data.

## Private Handoff and Cleanup

1. Share only the needed manifest entries through an approved private channel.
2. Do not paste credentials into slides, documents, tickets, PRs, chat, or screenshots.
3. After the presentation, remove the local manifest and rotate/reset the fictional preview passwords as appropriate for the preview project.
4. Run `git status --short` and confirm that `.preview/` is not tracked.

The pre-existing Registrar/Admin account is verification-only. This workflow never creates it, changes its password, or treats it as a public demo identity.
