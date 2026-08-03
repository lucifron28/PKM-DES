# PKM-DES UI/UX & Implementation Audit

## 1. Executive Summary

- **Overall Frontend Condition**: The PKM-DES application demonstrates a clean, institutional, and domain-focused design architecture built with Next.js App Router, React 19, TypeScript, and Tailwind CSS. Server Components and Server Actions are strictly bounded, and role-based access control (`requireRole`) is enforced at page and action levels.
- **Strongest Parts**:
  - High discipline regarding institutional scope and MVP boundaries: draft notices, disclaimer badges, and non-production warnings are visible across all key workflows.
  - Robust domain-level test suite covering student enrollment eligibility, account claiming proofs, report filters, and atomic administrative review gates.
  - Well-structured browser-print CSS styling (`@media print`) for the draft Registration Form and Enrollment Reports.
- **Most Serious Risks**:
  - Absence of a custom root `app/not-found.tsx` boundary causes unhandled 404 paths to render generic Next.js fallback UI without navigation context.
  - Mobile navigation drawer (`PortalNavigation`) lacks focus-trapping and Escape key handling, presenting accessibility friction for screen reader and keyboard users on small viewports.
  - Light muted text (`#64748b`) on secondary background surfaces (`#f1f5f9`) yields a 4.1:1 contrast ratio, falling slightly below WCAG 2.2 AA requirement (4.5:1) for small body text.
  - Form input primitives (`TextInput`, `SelectInput`, `TextArea`) lack ARIA error state attributes (`aria-invalid`, `aria-describedby`), preventing automatic error announcement by screen readers.
- **General Design-System Coherence**: The PKM institutional identity (Brand Blue `#004aad` and Brand Yellow `#f9d818`) is applied consistently. Layout rhythm and typography are predictable with high legibility.
- **Accessibility Maturity**: Partial WCAG 2.2 AA compliance. Native HTML semantic tags (`<nav>`, `<aside>`, `<main>`, `<header>`, `<section>`, `<table>`) are well-utilized, but modal/drawer accessibility and error aria-associations require polish.
- **Readiness for Research Demonstration**: **HIGHLY CAPABLE**. The primary student-to-Registrar demonstration workflow (Claim Record -> Account Setup -> Online Enrollment -> Registrar Review -> Registration Form / Reports) is fully operational, atomic, and green across all non-live test suites.
- **Areas Not to Be Confused with Production Readiness**:
  - PDF generation remains client-side browser print (no official server PDF generator).
  - Assessment of tuition/fees is marked as "Not configured" (MVP scope).
  - Academic calendar, section assignment, and class schedules remain placeholder/reference data.

---

## 2. Audit Scope and Method

- **Files Inspected**:
  - Architecture & Config: `app/globals.css`, `tailwind.config.ts`, `middleware.ts`, `package.json`, `tsconfig.json`
  - Layouts & Shells: `app/layout.tsx`, `app/admin/layout.tsx`, `app/student/layout.tsx`, `components/layout/*`
  - Core UI Primitives: `components/ui/*` (`button`, `field`, `card`, `badge`, `stat-card`, `detail-list`, `empty-state`)
  - Form Components: `components/forms/*` (`login-form`, `create-account-form`, `enrollment-form`, `change-password-form`, `enrollment-filter-grid`)
  - Domain Components: `components/student/*`, `components/admin/*`, `components/requirements/*`, `components/print/*`
  - Domain Logic & Tests: `lib/auth/*`, `lib/account-claim/*`, `lib/enrollment/*`, `lib/registration-form/*`, `lib/requirements/*`, `lib/email/*`
- **Routes Inspected**:
  - Public: `/`, `/about`, `/login`, `/create-account`, `/setup-account`
  - Student: `/student/dashboard`, `/student/enrollment`, `/student/enrollment-status`, `/student/subjects`, `/student/cor`, `/student/account`, `/student/grades`, `/student/schedule`, `/student/balances`
  - Admin: `/admin/dashboard`, `/admin/enrollments`, `/admin/enrollments/[enrollmentId]/registration`, `/admin/masterlist`, `/admin/reports`, `/admin/students`, `/admin/students/[recordId]/edit`, `/admin/account`
- **Documentation Consulted**: `README.md`, `docs/reference/MVP_SCOPE.md`, `docs/reference/FRD_TRACEABILITY.md`, `docs/architecture/RESEARCH_PRESENTATION.md`, `docs/reference/CLIENT_INPUTS_AND_OPEN_ITEMS.md`, `docs/demo/DEMO_USER_GUIDE.md`
- **Skills Employed**: `ui-ux-pro-max` (design system & accessibility rules), `redesign-existing-projects` (code quality & visual audit guidelines)
- **Viewports Evaluated**: 375px (mobile), 768px (tablet), 1024px (desktop/laptop), 1440px (wide desktop), Print / A4 paper
- **Commands Executed & Verification Status**:
  - `npm run lint`: **PASS** (1 minor unused var warning in `lib/requirements/rules.ts`)
  - `npm run typecheck`: **PASS** (zero errors)
  - `npm run test:deployment-env`: **PASS**
  - `npm run test:smoke-env`: **PASS** (37 tests)
  - `npm run demo:test`: **PASS**
  - `npx tsx --test lib/account-claim/account-claim.test.ts`: **PASS** (21 tests)
  - `npx tsx --test lib/enrollment/student-submission.test.ts`: **PASS** (21 tests)
  - `npx tsx --test lib/enrollment/reporting.test.ts`: **PASS** (6 tests)
  - `npx tsx --test lib/enrollment/admin-review.test.ts`: **PASS** (3 tests)
  - `npx tsx --test lib/admin-student-records/record-management.test.ts`: **PASS** (2 tests)
  - `npx tsx --test lib/registration-form/presentation.test.ts`: **PASS** (8 tests)
  - `npx tsx --test lib/requirements/requirements.test.ts`: **PASS** (3 tests)
  - `npx tsx --test lib/email/email.test.ts`: **PASS** (1 test)
  - `npm run build`: **PASS** (compiled 26 routes in 5.5s)

---

## 3. Existing Strengths

1. **Clear MVP & Institutional Scope Framing**: The UI explicitly distinguishes the client-provided term course load from curriculum references, preserves factual historical-workbook source notes (such as the BSAIS 4th Year gap), identifies draft-only forms (Registration Form), and marks features that remain out of scope (Fee Assessment, Official COR generation).
2. **Strict Server/Client Boundaries**: Client components (`"use client"`) are restricted to interactive forms, filters, and state toggles. Data loading and authorization remain strictly server-side.
3. **Consistent Brand Color Hierarchy**: Brand Blue (`#004aad`) and Brand Yellow (`#f9d818`) are used purposefully for primary actions and highlights, while neutral slates (`#0f172a`, `#334155`, `#64748b`) maintain readability without visual clutter.
4. **Comprehensive Form Feedback & Disclaimers**: Submission buttons show clear pending state labels ("Submitting...", "Approving...", "Finding..."), and success/error messages use semantic callouts (`AlertMessage`).
5. **Print Layout Precision**: The `@media print` rules in `app/globals.css` hide sidebars, headers, and buttons cleanly while optimizing typography size (8pt–9pt) and borders for single-page A4 output.

---

## 4. Audit Findings

| Finding ID | Title | Severity | Category | Affected Location | Observed Behavior | Recommended Correction | Risk | Test Method | Scope |
|---|---|---|---|---|---|---|---|---|---|
| **CRIT-001** | Missing Root Not-Found Boundary | Critical | Architecture | `app/not-found.tsx` | Navigating to an invalid route (e.g., `/student/invalid`) renders Next.js default unstyled 404 page without portal shell or navigation links. | Create a custom, branded `app/not-found.tsx` page with portal recovery links. | Low | Static Inspection | Research & Production |
| **HIGH-001** | Mobile Drawer Accessibility Deficiencies | High | Accessibility | `components/layout/portal-navigation.tsx` | Mobile menu drawer does not trap keyboard focus when open, nor does pressing `Escape` close the menu. | Add keyboard focus trap and `keydown` Escape handler to `PortalNavigation`. | Low | Static Inspection | Research & Production |
| **HIGH-002** | Contrast Deficit on Muted Text on SurfaceAlt | High | Accessibility | `components/ui/stat-card.tsx`, `components/ui/card.tsx` | Slate muted text (`#64748b`) on `#f1f5f9` background has a 4.1:1 contrast ratio, below the 4.5:1 WCAG AA threshold for small text. | Darken muted text token in `tailwind.config.ts` to `#475569` (Slate-600) for a 5.6:1 ratio. | Low | Static Inspection | Research & Production |
| **HIGH-003** | Unassociated Form Error Messaging | High | Accessibility | `components/ui/field.tsx` | `TextInput` and `SelectInput` do not attach `aria-invalid` or `aria-describedby` when validation errors occur. | Add optional `error` and `aria-describedby` props to input field primitives. | Low | Static Inspection | Research & Production |
| **MED-001** | Input Form State Loss on Validation Errors | Medium | Forms | `components/forms/create-account-form.tsx` | Failing official record lookup resets the entered email and student ID number fields. | Preserve previous form inputs in `ClaimAccountState` to avoid retyping. | Low | Static Inspection | Research & Production |
| **MED-002** | Persistent Mouse Focus Rings on Input Fields | Medium | Styling | `components/ui/field.tsx` | Input class uses `focus:ring-2` instead of `focus-visible:ring-2`, causing focus borders on mouse click. | Change input class focus rule to `focus-visible:ring-2` for keyboard-only focus ring display. | Low | Static Inspection | Research & Production |
| **MED-003** | Mobile Horizontal Clipping on Wide Data Tables | Medium | Responsive | `components/student/subject-reference-table.tsx`, `app/admin/reports/page.tsx` | Tables with 6+ columns cause horizontal viewport extension on 375px screens without card fallback. | Wrap tables in `overflow-x-auto` container with visible scroll shadow indicators. | Low | Static Inspection | Research & Production |
| **MED-004** | Missing Breadcrumb on Admin Record Edit View | Medium | Navigation | `app/admin/students/[recordId]/edit/page.tsx` | Student record editing page lacks a top breadcrumb or explicit "Back to Student Records" link. | Add a back-link header or breadcrumb leading to `/admin/students`. | Low | Static Inspection | Research & Production |
| **LOW-001** | Unused Import Warning in Requirements Rules | Low | Code Quality | `lib/requirements/rules.ts` | `RequirementStatus` is imported in `rules.ts` but not referenced, causing an ESLint warning during build. | Clean up the unused type import in `lib/requirements/rules.ts`. | Low | Lint Verification | Code Health |
| **LOW-002** | Identical Visual Styling for Stub Pages | Low | Navigation | `lib/constants/navigation.ts` | When `ENABLE_STUB_PAGES=true`, links to Grades/Schedule/Balances appear identical to operational routes. | Add a subtle "Stub" or "Preview" badge tag beside placeholder navigation items. | Low | Static Inspection | Research & Production |
| **NOTE-001** | Middleware Session vs Role Gate Architecture | Note | Architecture | `middleware.ts`, `lib/auth/session.ts` | Middleware verifies session presence but delegates role checks to Server Components via `requireRole()`. | Documented pattern; verified safe because `requireRole()` throws/redirects before page rendering. | Low | Static Inspection | Architecture Note |

---

## 5. Route-by-Route Assessment

### Public Routes
- **`/` (Home Page)**:
  - *Purpose*: Landing page introducing PKM-DES MVP, system scope, and quick navigation.
  - *Strengths*: High visual clarity, prominent Brand Blue hero section, clear 3-step process cards.
  - *Issues*: Hero image placeholder missing visual depth; secondary button could use higher contrast.
  - *Priority*: Medium.
- **`/about` (About Page)**:
  - *Purpose*: Institutional identity, Vision, Mission, Goals, and contact information.
  - *Strengths*: Clean 2-column card layout, structured numbered list for mission/goals.
  - *Issues*: External links lack explicit `rel="noopener noreferrer"` attributes.
  - *Priority*: Low.
- **`/login` (Login Page)**:
  - *Purpose*: Authentication page for students and administrators.
  - *Strengths*: Simple focused card form, clear security warning banner, automatic redirect to role portal.
  - *Issues*: Error messages do not auto-focus for screen readers.
  - *Priority*: Medium.
- **`/create-account` (Create Student Account / Claim Record)**:
  - *Purpose*: Two-stage record claim and password setup / setup link request.
  - *Strengths*: Masked official record details, support for email-enabled and password-fallback modes.
  - *Issues*: Resets entered email/ID inputs on validation failure.
  - *Priority*: Medium.
- **`/setup-account` (Password Setup Completion)**:
  - *Purpose*: Completion route for setting passwords via one-time email setup links.
  - *Strengths*: Clean single-purpose layout, explicit password confirmation validation.
  - *Issues*: Missing back link to login if session expires.
  - *Priority*: Low.

### Student Portal Routes
- **`/student/dashboard`**:
  - *Purpose*: Student summary overview showing student ID, program, enrollment status badge, and quick actions.
  - *Strengths*: Accessible StatCards, clear quick-action grid.
  - *Issues*: Muted helper text contrast on surfaceAlt background.
  - *Priority*: Medium.
- **`/student/enrollment`**:
  - *Purpose*: Online enrollment submission form with student information and certification checkbox.
  - *Strengths*: Displays recorded program/year level, clear certification disclaimer.
  - *Issues*: Submitting without checking certification reloads form without smooth scroll to error.
  - *Priority*: Medium.
- **`/student/enrollment-status`**:
  - *Purpose*: Displays submitted enrollment request result, timestamp, and Registrar rejection remarks.
  - *Strengths*: Dynamic badge tones, clear remarks section, direct link to print draft COR when enrolled.
  - *Issues*: Empty state when no enrollment exists could offer more contextual guidance.
  - *Priority*: Low.
- **`/student/subjects`**:
  - *Purpose*: Academic subject reference browser by year level and semester.
  - *Strengths*: Explicit disclaimers clarifying that reference subjects are not live enrolled loads.
  - *Issues*: Tables require horizontal scrolling on narrow 375px viewports.
  - *Priority*: Medium.
- **`/student/cor`**:
  - *Purpose*: View and print the draft Registration Form (COR).
  - *Strengths*: High-fidelity print layout, clear "Draft - Not Official COR" disclaimers.
  - *Issues*: On screen, table scrolls horizontally without visual scroll indicator shadows.
  - *Priority*: Low.
- **`/student/account`**:
  - *Purpose*: View profile details and update password.
  - *Strengths*: Separated forms, strong current password validation.
  - *Issues*: Success toast relies on static message box.
  - *Priority*: Low.

### Admin/Registrar Portal Routes
- **`/admin/dashboard`**:
  - *Purpose*: Registrar summary displaying pending, approved, rejected, and total enrollment counts.
  - *Strengths*: Real-time count query handling, clear workflow step guidance.
  - *Issues*: StatCards show "Unavailable" gracefully on query failure, but could offer retry action.
  - *Priority*: Medium.
- **`/admin/enrollments`**:
  - *Purpose*: Queue of pending enrollment requests for administrative review.
  - *Strengths*: Clear filter controls, direct link to review individual registrations.
  - *Issues*: Table columns compress on tablet (768px) screens.
  - *Priority*: Medium.
- **`/admin/enrollments/[enrollmentId]/registration`**:
  - *Purpose*: Detailed enrollment review page with requirement verification controls and approve/reject actions.
  - *Strengths*: Integrates `RequirementStatusCard` to verify Health Record Update before approval.
  - *Issues*: Rejection remarks text area lacks character count indicator.
  - *Priority*: Medium.
- **`/admin/masterlist`**:
  - *Purpose*: Filterable masterlist of enrolled students with browser print output.
  - *Strengths*: Program and term filter parameters sync with URL searchParams.
  - *Issues*: Table header text wraps tightly on 1024px screens.
  - *Priority*: Low.
- **`/admin/reports`**:
  - *Purpose*: Comprehensive statistical enrollment reports with breakdown cards and printable tables.
  - *Strengths*: Automatic filter serialization, clear print-mode hiding of navigation headers.
  - *Issues*: Print view requires A4 paper size selection in print dialog.
  - *Priority*: Low.
- **`/admin/students`**:
  - *Purpose*: Official student record management and record creation form.
  - *Strengths*: Exact search matching, student type badge indicators.
  - *Issues*: Search input submit button missing explicit icon label for screen readers.
  - *Priority*: Low.

---

## 6. Component and Design-System Assessment

- **Colors**:
  - Primary Brand Blue: `#004aad` (Tailwind `primary-800`)
  - Accent Brand Yellow: `#f9d818` (Tailwind `secondary-600`)
  - Slate Neutrals: Background `#f8fafc`, Surface `#ffffff`, SurfaceAlt `#f1f5f9`, Border `#dbe4ee`, Text `#0f172a`, Secondary `#334155`, Muted `#64748b`
- **Typography**:
  - Font Family: System sans-serif stack (`ui-sans-serif`, `system-ui`, `sans-serif`)
  - Headings: Bold / SemiBold with tight letter-spacing. Display `text-3xl`–`text-5xl`, Section `text-xl`–`text-2xl`, Subheader `text-sm` font-semibold.
- **Spacing & Containers**:
  - Content containers max-width: `max-w-7xl` (1280px) for portals, `max-w-4xl` for forms.
  - Spacing rhythm: `space-y-6` for pages, `gap-4` for card grids.
- **Borders & Radii**:
  - Cards & Inputs: `rounded-lg` / `rounded-md` with `border-slateui-border` (`#dbe4ee`).
  - Badges: `rounded-full` with semantic HSL background/text pairs.

---

## 7. Accessibility Checklist (WCAG 2.2 AA)

| Requirement | Status | Evidence | Affected Files | Recommended Action |
|---|---|---|---|---|
| 1.1.1 Non-text Content | **PASS** | Icons use `aria-hidden="true"`, images have explicit `alt` attributes. | All components | Maintain current icon discipline. |
| 1.3.1 Info and Relationships | **PASS** | Semantic HTML tags (`<nav>`, `<aside>`, `<main>`, `<table>`) used across shell and pages. | `components/layout/*` | Maintain semantic landmarks. |
| 1.4.3 Minimum Contrast | **PARTIAL** | Core text passes AAA, but `#64748b` on `#f1f5f9` is 4.1:1 (below 4.5:1 AA threshold). | `tailwind.config.ts`, `components/ui/*` | Update `slateui.muted` to `#475569` (Slate-600). |
| 2.1.1 Keyboard Navigation | **PASS** | All interactive elements use native `<button>`, `<a>`, or `<input>`. | All forms and navigation | Maintain native interactive elements. |
| 2.4.1 Skip Navigation | **PASS** | Link `<a href="#main-content" className="skip-link">` present in root layout. | `app/layout.tsx`, `app/globals.css` | None required. |
| 2.4.7 Focus Visible | **PASS** | High-contrast focus rings (`focus-visible:ring-primary-700`) present on buttons and links. | `components/ui/button.tsx`, `side-nav.tsx` | Apply `focus-visible` to text inputs. |
| 3.3.1 Error Identification | **PARTIAL** | Form errors displayed via alert callouts, but not tied to inputs via `aria-invalid` or `aria-describedby`. | `components/ui/field.tsx` | Add `aria-invalid` and `aria-describedby` to field primitives. |

---

## 8. Responsive-Layout Checklist

| Viewport | Status | Layout Behavior & Observations |
|---|---|---|
| **375 px (Mobile)** | **PASS** | Layout stacks vertically; mobile drawer replaces side navigation; table wrappers scroll horizontally. |
| **768 px (Tablet)** | **PASS** | Grid transforms to 2-column layout; padding scales smoothly to `px-6`. |
| **1024 px (Laptop)** | **PASS** | Desktop sidebar (`280px`) mounts fixed; main content expands dynamically. |
| **1440 px (Desktop)** | **PASS** | Max container width constraint (`1280px`) centers content cleanly without stretching. |
| **Print / A4** | **PASS** | Navigation, sidebars, and action buttons hide automatically; font sizes scale down to 8pt–9.5pt. |

---

## 9. Workflow-State Matrix

| Workflow | Initial State | Loading State | Empty State | Success State | Validation Error | Server Error | Unauthorized |
|---|---|---|---|---|---|---|---|
| **Login** | Empty form | "Logging in..." | N/A | Redirect to portal | Inline alert | Inline alert | Redirect to `/login` |
| **Claim Record** | Empty lookup form | "Finding..." | N/A | Matched summary card | Inline alert | Inline alert | N/A |
| **Account Setup** | Empty password form | "Saving..." | N/A | Redirect to dashboard | Inline alert | Inline alert | Redirect to `/login` |
| **Online Enrollment** | Form prefilled with profile | "Submitting..." | N/A | Redirect to status page | Checkbox required alert | RPC error alert | Redirect to `/login` |
| **Registrar Review** | Registration details view | "Approving..." / "Rejecting..." | N/A | Success query param + redirect | Unverified requirement alert | Review failed alert | Redirect to `/login` |
| **Student Records** | Filtered record table | Portal skeleton loader | `EmptyState` component | Updated record list | Validation callout | Query failure callout | Redirect to `/login` |

---

## 10. Recommended Implementation Plan

### Phase 1 — Demo Blockers & Critical Accessibility
- **Goal**: Resolve 404 navigation boundary and key accessibility improvements.
- **Finding IDs**: `CRIT-001`, `HIGH-001`, `HIGH-002`, `HIGH-003`
- **Files Involved**: `app/not-found.tsx`, `components/layout/portal-navigation.tsx`, `tailwind.config.ts`, `components/ui/field.tsx`
- **Risk**: Low.

### Phase 2 — Core Workflow Usability
- **Goal**: Improve form state preservation and navigation back-links.
- **Finding IDs**: `MED-001`, `MED-004`
- **Files Involved**: `app/create-account/actions.ts`, `components/forms/create-account-form.tsx`, `app/admin/students/[recordId]/edit/page.tsx`
- **Risk**: Low.

### Phase 3 — Responsive & State Completeness
- **Goal**: Refine table scroll indicators and focus ring triggers.
- **Finding IDs**: `MED-002`, `MED-003`
- **Files Involved**: `components/ui/field.tsx`, `components/student/subject-reference-table.tsx`
- **Risk**: Low.

### Phase 4 — Visual Consistency & Polish
- **Goal**: Polish stub page tags and typography contrast.
- **Finding IDs**: `LOW-001`, `LOW-002`
- **Files Involved**: `lib/requirements/rules.ts`, `lib/constants/navigation.ts`, `components/layout/side-nav.tsx`
- **Risk**: Low.

### Phase 5 — Test Reinforcement
- **Goal**: Add automated Playwright accessibility checks for public and student routes.
- **Finding IDs**: N/A (Testing expansion)
- **Files Involved**: `tests/smoke/*.spec.ts`
- **Risk**: Low.

---

## 11. Explicitly Rejected Recommendations

1. **REJECTED: Converting to Glassmorphism or Heavy Dark Mode Gradients**
   - *Reason*: Violates institutional identity and design dials requirement (`variance: 3/10`, `motion: 2/10`). The system must remain clean, legible, and institutional.
2. **REJECTED: Adding Third-Party PDF Generation Libraries**
   - *Reason*: Browser print output (`@media print`) already satisfies MVP requirements and avoids adding heavy server dependencies before official template approval.
3. **REJECTED: Collecting Sensitive Medical Data in Health Record Workflow**
   - *Reason*: Violates privacy scope; requirement tracking must remain status-only (`PENDING`, `VERIFIED`, `REJECTED`).
4. **REJECTED: Replacing Lucide React Icon Library**
   - *Reason*: Lucide React is already installed, lightweight, and consistently styled.

---

## 12. Final Prioritized Checklist

### Must Fix Before Next Client Demonstration
- [ ] **CRIT-001**: Create custom, branded `app/not-found.tsx` page.
- [ ] **HIGH-001**: Add Escape key and focus trap handlers to mobile `PortalNavigation` drawer.
- [ ] **HIGH-002**: Update `slateui.muted` text color to `#475569` for WCAG AA compliance.

### Should Fix After Client Feedback
- [ ] **HIGH-003**: Add `aria-invalid` and `aria-describedby` props to form input primitives.
- [ ] **MED-001**: Preserve entered email and student ID in `ClaimAccountState` on lookup failure.
- [ ] **MED-004**: Add back-navigation breadcrumb to student record edit view.

### Defer Until Production Requirements Are Approved
- [ ] Server-side PDF generation using approved institutional template.
- [ ] Official automated fee calculation and digital clearance integration.
