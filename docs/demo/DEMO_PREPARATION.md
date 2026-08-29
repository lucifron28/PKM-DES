# PKM-DES Final Demo Preparation

The demo scripts prepare the exact fictional Auth identities, application profiles, official-role assignments, and one clean primary student fixture used by the browser demonstration.

## Required explicit target opt-in

The scripts fail closed unless the target is explicitly identified. Load the project environment, then set these values for the intended demo project:

```powershell
$env:PKM_ALLOW_DEMO_SEED = "true"
$env:PKM_DEMO_PROJECT_REF = "<supabase-project-ref>"
$env:PKM_DEMO_ENVIRONMENT = "<development-preview-or-explicit-demo-label>"
$env:PKM_DEMO_CONFIRM = "PREPARE_PKM_DES_DEMO"
```

The project URL must match `PKM_DEMO_PROJECT_REF`. The scripts never send email and use Supabase Auth Admin APIs with `email_confirm: true`.

## Prepare and verify

```powershell
npm run demo:prepare
npm run demo:verify
```

`demo:prepare` is idempotent for the allowlisted demo emails and Student ID. It updates only those demo-owned profiles, passwords, role assignments, official record, and primary workflow state. It does not truncate tables or target other students.

When the primary student already has immutable signature history, repair only the six staff accounts without touching the student workflow:

```powershell
npm run demo:prepare -- --accounts-only
npm run demo:verify:accounts
```

The account-only path uses the fixed `Demo1234!` password, repairs duplicate or stale assignments on the named fictional demo profiles, and never deletes signatures.

## Reset the primary workflow

```powershell
npm run demo:reset
```

The reset removes only the primary student’s current-term enrollment, subject snapshots, clearance rows, notification rows, and unverified Health Record requirement. It preserves audit history. If immutable current-term signatures already exist, it stops instead of deleting them.

The older three-state fixture tooling remains available as `npm run demo:reset:legacy` and `npm run demo:verify:legacy`.
