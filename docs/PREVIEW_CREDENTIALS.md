# Private Preview Credentials

## Purpose

This local-only workflow prepares unique passwords for the three fictional student accounts used in the PKM-DES research MVP demo. It also verifies the existing internal Registrar/Admin account without creating, changing, or exposing that account.

For the hosted temporary-preview boundary, deployment order, and cleanup procedure, see [CLIENT_PREVIEW_DEPLOYMENT.md](./CLIENT_PREVIEW_DEPLOYMENT.md).

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

Copy placeholders from `.env.example` into an ignored local environment file. All real values remain there only; they must never be committed, captured, or pasted into general chat.

### Shared Supabase Configuration

```text
NEXT_PUBLIC_SUPABASE_URL=<preview-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<preview-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<preview-service-role-key>
```

### Guarded Demo Reset

```text
DEMO_STUDENT_PASSWORD=<bootstrap-password>
DEMO_RESET_CONFIRM=RESET_PKM_DES_DEMO
DEMO_REGISTRAR_EMAIL=<optional-provided-privately>
```

`DEMO_STUDENT_PASSWORD` is a bootstrap/reset password only. Do not hand it to presenters as a final preview password. `DEMO_RESET_CONFIRM=RESET_PKM_DES_DEMO` is required by both the reset dry run and the applied reset. `DEMO_REGISTRAR_EMAIL` is optional and only links reviewed fictional records to an existing internal admin profile.

### Preview Credential Preparation

```text
PREVIEW_EXPECTED_SUPABASE_HOST=<preview-project-ref>.supabase.co
PREVIEW_REGISTRAR_EMAIL=<provided privately>
PREVIEW_REGISTRAR_PASSWORD=<provided privately>
```

### Apply-Only Confirmation

```text
PREVIEW_CREDENTIALS_CONFIRM=PREPARE_PKM_DES_PREVIEW_CREDENTIALS
```

Set `PREVIEW_CREDENTIALS_CONFIRM` only for an intentional `--apply` operation. Remove or clear it afterward when practical.

## Canonical Presentation Preparation Order

Run this sequence in order on a dedicated preview or test Supabase project:

1. Configure the ignored local environment with every value above.
2. Inspect the guarded reset plan:

   ```bash
   npm run demo:reset -- --dry-run
   ```

3. Apply the guarded reset:

   ```bash
   npm run demo:reset
   ```

4. Verify the fictional demonstration dataset:

   ```bash
   npm run demo:verify
   ```

5. Run the non-mutating preview-credential dry run:

   ```bash
   npm run preview:credentials:prepare
   ```

6. Set the apply-only confirmation, then prepare the private credential set:

   ```bash
   npm run preview:credentials:prepare -- --apply
   ```

7. Verify prepared identities and credentials:

   ```bash
   npm run preview:credentials:verify
   ```

8. Hand off only the required entries through an approved private channel.

## Required Demo State

The canonical sequence above establishes the required fictional state before credentials are prepared. It must run only on a dedicated preview/test project.

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

## Reset Invalidation

Running `npm run demo:reset` after preview credentials have been prepared makes the local credential manifest stale. The reset may restore the bootstrap student password. Delete or privately archive obsolete local manifests as appropriate, then rerun preview preparation and verification before presenting. Never assume an older manifest remains valid after a reset.

## Private Handoff and Cleanup

1. Share only the needed manifest entries through an approved private channel.
2. Do not place the plaintext temporary manifest or its contents in Git or GitHub; commits, branches, pull requests, reviews, or issues; ChatGPT or other general chat messages; screenshots or terminal captures; public slides or shared documents; Vercel environment variables, deployment logs, or preview pages; or public cloud storage.
3. After the presentation, remove the local manifest and rotate/reset the fictional preview passwords as appropriate for the preview project.
4. Run `git status --short` and confirm that `.preview/` is not tracked.

The plaintext temporary manifest may be privately distributed only to authorized presenters through an approved private channel. The pre-existing Registrar/Admin account is verification-only. This workflow never creates it, changes its password, or treats it as a public demo identity.
