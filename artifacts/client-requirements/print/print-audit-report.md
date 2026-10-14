# Registration print QA report

Date: 2026-10-14
Status: Layout accepted after main's final visual review. Typography remains limited by the local renderer's Arial fallback for Aptos.
Scope: registration print presentation and timezone formatting only. No hosted database operations, signature-snapshot edits, commits, or deployment.

## Reference and geometry

- The native Word page render `word-native-registration-reference-page-1.png` is authoritative; the malformed DOCX HTML export is not used as visual proof.
- Word places staff names above thin blue signature lines and role captions below, with no printed electronic-signature timestamps. Right lane: Program Chair, Dean, Nurse, Registrar. Left lane: Librarian and Acting Municipal Accountant. The student signature line and copy label sit near the bottom.
- Horizontal page geometry is unchanged: 0.5 in top, 0.3125 in side, 0.2 in bottom margins; 100% border-box section with 0.1875 in side padding. On the 816 × 1056 px Letter raster, the table spans x=48..767, the full copy label begins at x=30, and no right edge is clipped.
- Current page-1 measured rules: Program Chair y=732, Dean y=788, Nurse y=844, Librarian y=846, Accountant/Registrar y=902. Word targets are y=733, 788–789, 843–844, 843–844, and 900 respectively. The student rule is y=1012 (Word y=1012), privacy box top y=922 (Word y=923), and copy-label top y=999 (Word y≈1000). Staff lines span x=545..774 on the right and x=263..491 on the left; student line x=497..775. This replaces the prior print transform with normal flow positioning.
- Historical page 1 uses the shorter unconfigured-finance fixture, so its lower content flows about 30 px higher: staff rules y=701/758/814–816/871, privacy top y=892, student line y=982. No financial values were invented to fill that space.
- Word specifies Aptos 11 pt for names/roles. CSS requests 11 pt Aptos; Aptos is not installed in this renderer, so browser fallback is Arial. Local glyph widths are not an exact Aptos match.

## Print data

- Copy order remains Student, Dean, Registrar, Accountant, followed by one policy page. `EnrollmentSubject.day`, `.time`, and `.room` render from snapshots; missing values remain `TBA`.
- Current fixture covers nine subjects, 27 units, long student/program text, configured schedules, a partial assessment, and six synthetic receipts. It shows the four newest receipts and keeps the omitted-receipt notice on screen. Missing finance values remain `Not configured`.
- Registrar name/date come from the recorded approval projection. No Registrar ink is fabricated. Current QA signatures/receipts are synthetic; historical QA signer snapshots are unchanged and its pledge is unsigned. No `ENROLLED` status is printed.
- Dates use `Asia/Manila`; `2026-10-13T16:30:00Z` displays as Oct 14, 2026, 12:30 AM.

## Latest artifacts and visual result

- Current QA PDF: `registration-current-official-names-finance-receipts-registrar-synthetic-word-aligned-final.pdf` (five Letter pages). Fresh 96 dpi rasters: `registration-current-official-names-finance-receipts-registrar-synthetic-word-aligned-final-page-1.png` through `-5.png`.
- Historical QA PDF: `registration-historical-original-signatures-unsigned-pledge-word-aligned-final.pdf` (five Letter pages). Fresh 96 dpi rasters: `registration-historical-original-signatures-unsigned-pledge-word-aligned-final-page-1.png` through `-5.png`.
- Metrics: `registration-print-word-aligned-final-metrics.json`. Native Word reference remains `word-native-registration-reference-page-1.png`.
- Main's final visual review confirms all five current pages and the reviewed historical pages contain their full forms. Pages are unclipped, the policy page has no watermark, and the historical pledge remains unsigned. The independent page-2 raster and `pypdf` extraction also confirm the full Dean form. The earlier label-only finding was a mistaken raster interpretation, not missing PDF content.
- The native Word reference is saved at `word-native-registration-reference-page-1.png` (148,869 bytes) for inspection. Poppler used here is under `C:\Users\Ron\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin`; `pdftoppm.exe` and `pdfinfo.exe` are present, but `pdftotext.exe` is not. Page-limited text verification used the bundled Python `pypdf` package instead.
- Current CSS SHA-256: `F5D8393FABD37C012E8C9FDCA3E3DB7BC4C33D0CBCCE56DDB25F871AB04A078A`. Current PDF SHA-256: `CF78D738FB70003B4DA27A260EEE5DEA1B631BB66F7C83969EE9F43FFCC2FB05`. Historical PDF SHA-256: `16C33CF9AFB06D61E49DE11F595CE9F4D4ECECE04473269044F6C1289112FDBA`.

## Checks

- Final build: `npm run build` passed with exit code 0 on source commit `7ad3434d9279dc9381117af00eb0034e24f27755`. The print CSS SHA-256 at build start was `F5D8393FABD37C012E8C9FDCA3E3DB7BC4C33D0CBCCE56DDB25F871AB04A078A`.
- The build process used `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and dummy Supabase/account-claim keys, with `VERCEL` empty. The Vercel environment check skipped outside Vercel. No hosted Supabase URL or keys were used.
- Next.js compiled successfully, completed its lint/type validation, generated all 30 static pages, and collected build traces. It emitted a webpack cache rename `EPERM` warning, an outdated Browserslist data warning, and existing lint warnings. The build still exited 0.
- Fixture renderer completed using the TSX stub loader; `pdfinfo` confirms five 612 × 792 pt Letter pages for each PDF. All ten page PNGs were rasterized after PDF generation. An independent page-2 raster and page-limited PDF text extraction confirmed full current copy content.
- Focused print and finance tests: 10/10 passed. `npm run typecheck`: passed.
- Focused ESLint: zero errors, one existing `@next/next/no-img-element` warning in `components/print/registration-form.tsx`.
- Main's elevated `git diff --check` passed with exit code 0. The final review made no source, render, or test changes; only this report was updated.
- No full build was repeated. No commit, push, merge, hosted write, or deploy occurred.
