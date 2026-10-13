# Phase 1A registration print QA — 2026-10-09

## Browser and print

Rendered the current-signed and historical enrollment with synthetic, local-only fixtures; no live enrollment or Supabase data was loaded. Exported with Chromium at Letter portrait, 100% scale, and print backgrounds enabled. Both PDFs contain exactly two nonblank pages; each page box is 612 × 792 pt.

| Case | PDF | Pages | Page screenshots |
|---|---|---:|---|
| Current signed | [PDF](phase1a-current-signed-letter-20261009.pdf) | 2 | [Front](phase1a-current-page-1-20261009.png), [policy back](phase1a-current-page-2-20261009.png) |
| Historical | [PDF](phase1a-historical-letter-20261009.pdf) | 2 | [Front](phase1a-historical-page-1-20261009.png), [policy back](phase1a-historical-page-2-20261009.png) |

Browser captures: [current signed](phase1a-current-screen-20261009.png), [historical](phase1a-historical-screen-20261009.png).

Both fronts show the 474 × 474 watermark at computed 5% opacity; the two policy pages have no watermark. Front tables (nine subjects), assessment, six signature blocks, and Student's Copy fit without clipping. Policy paragraphs and guidelines are centered; the prerequisite warning is left-aligned; the pledge signature block is centered; the title divider is absent. Historical signing explanation remains on screen, is hidden in print, and the back-page pledge signature line is blank with no signer metadata. Neither PDF contains `UNSIGNED HISTORICAL PLEDGE` or `Pledge not yet signed`.

## Isolated database verification

Used a disposable Supabase project `pkm-des-registration-policy-20261009` on `127.0.0.1:55322`. The existing `PKM-DES` local stack on port 54322 and its volume were left running and untouched. Applied `20261002150009_student_registration_signature_policy_guard.sql` locally. Pre/post snapshots confirmed: approved historical enrollment and signature fingerprint unchanged; pending history backfilled to `pledge-v1` while its immutable old signature no longer matches the current fingerprint. The focused authenticated registrar/signature test (`Step 26 & 35`) passed, covering missing acknowledgment, accepted signing, unknown pledge rejection, policy-only Student fingerprint changes, official-signature currency, current clearances, and SQL/TypeScript fingerprint parity.

The full integration file ran 5/7 tests successfully. Two unrelated health-record cases failed: the special-nurse case returned `health_record_not_submitted` instead of `signed`; the mode-change case found `health_clearance_is_current = false` where it expected true. These health-record failures are not covered by the focused policy test and were not changed here.
