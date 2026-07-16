# Client Preview Deployment

## Purpose and Boundary

PKM-DES may be hosted only as a temporary, fictional-data research-presentation preview. It is not an official enrollment service, production system, or place for real student information or institutional records.

This guide does not authorize a manual Vercel deployment, a custom domain, a production launch, Supabase changes, or the use of real data.

## Vercel Runtime Variables

Configure only these values in the authorized Vercel scope for the dedicated fictional-data preview project:

```text
DATABASE_PROVIDER=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ACCOUNT_CLAIM_SECRET=
NEXT_PUBLIC_ENABLE_STUB_PAGES=
```

`NEXT_PUBLIC_*` values are client-visible application configuration. `SUPABASE_SERVICE_ROLE_KEY` and `ACCOUNT_CLAIM_SECRET` are server-only and must never appear in browser code, logs, screenshots, or documentation. Stub pages must remain omitted, empty, or disabled; the current application enables them only when `NEXT_PUBLIC_ENABLE_STUB_PAGES=true`.

When intentionally configured, the existing term variables are `NEXT_PUBLIC_CURRENT_ACADEMIC_YEAR` and `NEXT_PUBLIC_CURRENT_SEMESTER`. They use the application’s current supported values and must be coordinated with the database enrollment rule. No new term variables are introduced here.

## Local Operator Variables

Keep these values only in an ignored local environment file:

```text
DEMO_STUDENT_PASSWORD
DEMO_RESET_CONFIRM
DEMO_REGISTRAR_EMAIL
PREVIEW_EXPECTED_SUPABASE_HOST
PREVIEW_REGISTRAR_EMAIL
PREVIEW_REGISTRAR_PASSWORD
PREVIEW_CREDENTIALS_CONFIRM
```

The Vercel prebuild guard rejects these variables when present. Do not add preview credentials, reset passwords, or Registrar identities to Vercel.

## Supabase Project Agreement

Vercel runtime configuration and local reset/credential tooling must target the same dedicated fictional-data Supabase project. Compare only the sanitized project hostname. Never copy keys into documentation or chat. The project must not be institutional, production, personal, or unrelated, and this branch does not change its settings or data.

## Vercel Scopes

- Development: local work; use ignored local environment files.
- Preview: ordinary pull-request deployments for internal technical review.
- Production: a client-facing stable deployment only after explicit authorization.

A changing PR URL is not a final client-preview link. Do not configure Production-scoped values without explicit authorization, add a custom domain, or put credentials in Vercel comments, deployment descriptions, logs, screenshots, or pages.

## Current Authentication Behavior

The MVP uses Supabase password login. Public account claiming uses the existing server-side administrative flow, and fictional users are confirmed through the current implementation. There is no OAuth flow and no new callback route is required. Do not add broad wildcard redirect URLs; any future redirect URL must be exact and explicitly authorized.

## Canonical Deployment Order

1. Confirm PR #36 and this deployment-readiness branch are merged into `main`.
2. Confirm the target is a dedicated fictional-data Supabase preview project.
3. Configure only the required Vercel runtime variables.
4. Confirm local operator-only variables are absent from Vercel.
5. Run `npm run test:deployment-env`.
6. Run the existing focused regression checks.
7. Run `npm run typecheck` and `npm run lint`.
8. Run an ordinary local `npm run build` and confirm the Vercel-only guard skips safely.
9. Validate strict deployment environment behavior using fictional injected tests only.
10. Push the authorized commit and allow the existing Git integration to create its ordinary preview deployment.
11. Confirm the deployment status succeeds and the URL uses HTTPS.
12. Confirm Home, Login, and Create Student Account render.
13. Confirm unauthenticated student and admin routes redirect to Login.
14. Run the guarded demo reset locally against the same dedicated preview project.
15. Run private preview-credential preparation locally.
16. Run private credential verification locally.
17. Perform later manual workflow checks using fictional accounts only.
18. Share the stable authorized URL and necessary credentials through separate private channels.
19. Record client feedback without credentials or private identities.

Detailed automated workflow smoke tests belong to the later `test/demo-workflow-smoke-tests` branch and are not implemented here.

## Manual Preview Checklist

- [ ] Home, Login, and Create Student Account render.
- [ ] `robots.txt` disallows crawling.
- [ ] `X-Robots-Tag` and conservative security headers are present.
- [ ] Unauthenticated student and admin routes redirect to Login.
- [ ] No configuration error or stack trace is displayed.
- [ ] Stub navigation is not exposed.
- [ ] No active credential appears in page source.
- [ ] Fictional student login works after private credential preparation. Manual; not performed in this branch.
- [ ] Registrar credentials remain private. Manual; not performed in this branch.
- [ ] Logout clears the authenticated session. Manual; not performed in this branch.

## Rollback and Cleanup

If the preview ends or exposure is suspected:

1. Stop distributing the client-preview URL.
2. Remove or disable the temporary deployment through authorized Vercel access.
3. Rotate or reset fictional student passwords and remove local plaintext manifests.
4. Clear local apply-only confirmations and remove obsolete Vercel environment values.
5. Rotate server secrets if exposure is suspected.
6. Retain no real student or institutional data.
7. Record only sanitized technical findings; never put credentials in client-feedback records.

No rollback action is performed by this branch.
