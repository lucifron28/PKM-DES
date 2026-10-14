import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClearanceOverview } from "@/components/signatures/clearance-overview";
import { EnrollmentLoadEditor } from "@/components/admin/enrollment-load-editor";
import { RegistrarWorkflowSteps } from "@/components/admin/registrar-workflow-steps";
import { ESignatureInput } from "@/components/signatures/e-signature-input";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { retryEnrollmentDecisionEmailAction } from "@/app/admin/enrollments/actions";
import { applyOfficialClearanceSignatureAction } from "@/app/admin/enrollments/signature-actions";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { CLEARANCE_DEFINITIONS, getEnrollmentClearanceOverview } from "@/lib/signatures/clearances";
import { loadEnrollmentSignaturePresentation, signatureEvidenceByClearance } from "@/lib/signatures/presentation";
import { loadCurrentSignatureSpecimen } from "@/lib/signatures/specimens";
import { REGISTRATION_POLICY_VERSION } from "@/lib/registration-form/policy";
import { canSignClearance, loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import { getHealthVerificationViewState, healthVerificationStateLabel, healthVerificationStateTone } from "@/lib/health-records/presentation";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { formatName } from "@/lib/utils/format";
import type { CourseOffering, EnrollmentDecisionNotification } from "@/types/database";
import { parseEnrollmentFinancialSummary } from "@/lib/finance/presentation";

export default async function AdminRegistrationFormPage({
  params,
  searchParams
}: {
  params: Promise<{ enrollmentId: string }>;
  searchParams?: Promise<{ email?: string; load?: string; load_error?: string }>;
}) {
  const { supabase, profile } = await requireRegistrarAdmin();
  const { enrollmentId } = await params;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subject_id, course_offering_id, course_code, course_description, units, day, time, room, subjects(*), course_offerings(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  const emailParams = (await searchParams) ?? {};

  if (error) {
    console.error("registration_form:admin_enrollment_load");
    return (
      <EmptyState
        title="Registration form could not be loaded"
        description="Please try again. No registration form is shown until the selected enrollment data is available."
      />
    );
  }

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment) {
    return <EmptyState title="Enrollment record not found." description="The selected registration form is not available." />;
  }

  const [registrarApprovalResult, financialSummaryResult] = await Promise.all([
    supabase.rpc("get_registrar_approval", { p_enrollment_id: enrollment.id }),
    supabase.rpc("get_enrollment_financial_summary", { p_enrollment_id: enrollment.id })
  ]);
  const { data: registrarApprovalData, error: registrarApprovalError } = registrarApprovalResult;
  const { data: financialSummaryData, error: financialSummaryError } = financialSummaryResult;
  if (registrarApprovalError) console.error("registration_form:registrar_approval_load");
  if (financialSummaryError) console.error("registration_form:financial_summary_load");
  const approvalCandidate = Array.isArray(registrarApprovalData) ? registrarApprovalData[0] : null;
  const registrarApproval = approvalCandidate && typeof approvalCandidate.name === "string" && approvalCandidate.name.trim() &&
    typeof approvalCandidate.approved_at === "string" && Number.isFinite(Date.parse(approvalCandidate.approved_at))
    ? { name: approvalCandidate.name.trim(), approved_at: approvalCandidate.approved_at }
    : null;
  const financialSummary = parseEnrollmentFinancialSummary(financialSummaryData);

  const offeringsResult = enrollment.status === "PENDING"
    ? await supabase
        .from("course_offerings")
        .select("id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document, created_at, updated_at")
        .eq("program_id", enrollment.program_id)
        .eq("academic_year", enrollment.academic_year)
        .eq("semester", enrollment.semester)
        .order("course_code", { ascending: true })
    : { data: [], error: null };
  if (offeringsResult.error) console.error("registration_form:course_offerings_load");

  const signatureSpecimen = await loadCurrentSignatureSpecimen(supabase, profile.id);

  const healthApplicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: enrollment.students?.student_type ?? "",
    official_gender_sex: enrollment.students?.official_student_records?.gender_sex ?? null
  });
  const [requirementResult, assignmentsResult] = await Promise.all([
    supabase
      .from("student_requirements")
      .select("id, student_id, requirement_code, status, academic_year, semester, applicability, note, verified_at, verified_by, created_at, updated_at")
      .eq("student_id", enrollment.student_id)
      .eq("requirement_code", "HEALTH_RECORD_UPDATE")
      .eq("academic_year", enrollment.academic_year)
      .eq("semester", enrollment.semester)
      .maybeSingle(),
    loadActiveOfficialRoleAssignments(supabase, profile.id)
  ]);
  const healthRequirement = (requirementResult.data as StudentRequirementRecord | null) ?? null;
  if (requirementResult.error) console.error("registration_form:health_requirement_load");
  const signatureResult = await loadEnrollmentSignaturePresentation(supabase, enrollment, {
    applicability: healthApplicability,
    status: healthRequirement?.status ?? "PENDING"
  });
  if (signatureResult.error) console.error("registration_form:signature_load");
  if (assignmentsResult.error) console.error("registration_form:official_assignment_load");

  const presentationEnrollment: PrintableEnrollment = {
    ...enrollment,
    enrollment_signatures: signatureResult.signatures,
    health_requirement_applicability: healthApplicability,
    financial_summary: financialSummary,
    registrar_approval: registrarApproval
  };
  const studentPledgeSignature = signatureResult.signatures
    .filter((signature) => signature.clearance_type === "STUDENT_ENROLLMENT_SIGNATURE")
    .at(-1);
  const studentPledgeCovered =
    enrollment.registration_pledge_version === REGISTRATION_POLICY_VERSION &&
    Boolean(studentPledgeSignature?.is_current);
  const signatureEvidence = signatureEvidenceByClearance(signatureResult.signatures);
  const clearanceOverview = getEnrollmentClearanceOverview(healthApplicability, signatureEvidence);
  const officialClearanceDefinitions = CLEARANCE_DEFINITIONS.filter((definition) => definition.signerRole !== "STUDENT");

  const { data: notificationData, error: notificationError } = await supabase
    .from("enrollment_decision_notifications")
    .select("id, enrollment_id, decision, recipient_email, academic_year, semester, status, attempt_count, last_error_code, reserved_at, sent_at, created_at, updated_at")
    .eq("enrollment_id", enrollmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (notificationError) console.error("registration_form:notification_load");

  const notification = notificationData as EnrollmentDecisionNotification | null;
  const emailMessage = emailParams.email === "sent"
    ? "The student notification was sent to the configured email provider."
    : emailParams.email === "not_configured"
      ? "The enrollment decision was saved, but email delivery is not configured."
      : emailParams.email === "failed"
        ? "The enrollment decision was saved, but the student notification could not be sent."
        : null;
  const editorSubjects = (enrollment.enrollment_subjects ?? []).map((subject) => ({
    id: subject.id,
    course_offering_id: subject.course_offering_id,
    course_code: subject.course_code,
    course_description: subject.course_description,
    units: subject.units,
    day: subject.day ?? null,
    time: subject.time ?? null,
    room: subject.room ?? null
  }));
  const editorKey = JSON.stringify({
    term: [enrollment.academic_year, enrollment.semester],
    status: enrollment.status,
    subjects: editorSubjects.map(({ id, course_offering_id, units, day, time, room }) => [id, course_offering_id, units, day, time, room]),
    offerings: ((offeringsResult.data as CourseOffering[] | null) ?? []).map((offering) => offering.id)
  });

  return (
    <div className="space-y-4">
      <div className="print-hidden"><RegistrarWorkflowSteps status={enrollment.status} /></div>
      {emailParams.load_error ? (
        <p role="alert" className="print-hidden rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
          {emailParams.load_error === "approved_immutable"
            ? "Approved enrollment contents cannot be edited. Historical subject data and signatures remain unchanged."
            : emailParams.load_error === "unauthorized"
              ? "Registrar access is required to edit this load."
              : emailParams.load_error === "invalid_schedule_text"
                ? "Day, time, and room fields cannot contain the | character or line breaks."
              : "The load or schedule could not be saved. Check the values and try again."}
        </p>
      ) : null}
      {emailParams.load ? (
        <p role="status" className="print-hidden rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
          {emailParams.load === "created" ? "Pending Registrar-managed enrollment created." : emailParams.load === "unchanged" ? "No load or schedule values changed." : "Enrollment load and schedules saved."}
        </p>
      ) : null}
      <div className="print-hidden">
        <EnrollmentLoadEditor
          key={editorKey}
          enrollmentId={enrollment.id}
          status={enrollment.status}
          studentType={enrollment.students?.student_type ?? "Regular Student"}
          subjects={editorSubjects}
          offerings={(offeringsResult.data as CourseOffering[] | null) ?? []}
          notice={offeringsResult.error ? "Course offerings could not be loaded. Existing schedule values can still be reviewed." : null}
        />
      </div>
      {emailMessage ? (
        <div
          role={emailParams.email === "sent" ? "status" : "alert"}
          aria-live={emailParams.email === "sent" ? "polite" : undefined}
          className={`print-hidden rounded-lg border px-4 py-3 text-sm font-medium ${emailParams.email === "sent" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {emailMessage}
        </div>
      ) : null}

      {notification ? (
        <section className="print-hidden rounded-lg border border-slateui-border bg-white p-4 shadow-sm" aria-labelledby="notification-status-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="notification-status-heading" className="font-bold text-slateui-text">Student notification</h2>
              <p className="mt-1 text-sm text-slateui-muted">Email delivery is separate from the Registrar decision.</p>
            </div>
            <Badge tone={notification.status === "SENT" ? "success" : notification.status === "FAILED" ? "error" : "warning"}>
              {notification.status}
            </Badge>
          </div>
          {notification.status === "FAILED" ? (
            <form action={retryEnrollmentDecisionEmailAction} className="mt-3">
              <input type="hidden" name="enrollment_id" value={enrollmentId} />
              <input type="hidden" name="decision" value={notification.decision} />
              <Button type="submit" variant="outline">Retry student notification</Button>
            </form>
          ) : null}
        </section>
      ) : null}

      <div className="print-hidden space-y-4">
        {signatureResult.error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900" role="alert">
            Signature evidence could not be loaded safely. Signing controls are unavailable until the page is refreshed.
          </p>
        ) : (
          <ClearanceOverview items={clearanceOverview} />
        )}
        {!signatureResult.error ? <div className="grid gap-4 lg:grid-cols-2">
          {officialClearanceDefinitions.map((definition) => {
            const signature = signatureResult.signatures.filter((item) => item.clearance_type === definition.clearanceType).at(-1) ?? null;
            const isHealthNotApplicable = definition.clearanceType === "HEALTH_CLEARANCE" && healthApplicability !== "APPLICABLE";
            if (isHealthNotApplicable) return null;
            const signedSignature = signature
              ? {
                  signerName: signature.signer_name_snapshot,
                  signedAt: signature.signed_at,
                  signedUrl: signature.signed_url,
                  isCurrent: signature.is_current,
                  inputType: "DRAWN" as const
                }
              : null;
            if (definition.signerRole === "NURSE") {
              const healthState = getHealthVerificationViewState({
                applicability: healthApplicability,
                status: healthRequirement?.status ?? "PENDING",
                nurseSignatureIsCurrent: Boolean(signedSignature?.isCurrent)
              });
              return (
                <section key={definition.clearanceType} className="rounded-lg border border-slateui-border bg-slateui-surfaceAlt p-4" aria-label="Registrar Health Record Update status">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slateui-text">Health Record Update</h3>
                      <p className="mt-1 text-sm leading-6 text-slateui-secondary">Registrar view only. The assigned Nurse controls verification, rejection, and e-signature.</p>
                    </div>
                    <Badge tone={healthVerificationStateTone(healthState)}>{healthVerificationStateLabel(healthState)}</Badge>
                  </div>
                  {healthRequirement?.note ? <p className="mt-3 text-sm text-slateui-secondary"><span className="font-semibold text-slateui-text">Administrative note:</span> {healthRequirement.note}</p> : null}
                </section>
              );
            }
            const isAuthorized = canSignClearance(assignmentsResult.assignments, definition.clearanceType, enrollment.program_id);
            const hasCurrentSignature = signedSignature?.isCurrent === true;

            if (!hasCurrentSignature && !isAuthorized) {
              return (
                <section key={definition.clearanceType} className="rounded-lg border border-slateui-border bg-slateui-surfaceAlt p-4" aria-label={`${definition.signerLabel} authorization status`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slateui-text">{definition.label}</h3>
                      <p className="mt-1 text-sm leading-6 text-slateui-secondary">You are not authorized to sign this clearance. An active {definition.signerLabel} assignment is required.</p>
                    </div>
                    <Badge tone="neutral">Not authorized</Badge>
                  </div>
                  {signedSignature ? (
                    <p className="mt-3 text-xs leading-5 text-slateui-muted">A previous signature is retained in the audit history but is not current. An assigned {definition.signerLabel} must re-sign.</p>
                  ) : null}
                </section>
              );
            }

            return (
              <ESignatureInput
                key={definition.clearanceType}
                action={applyOfficialClearanceSignatureAction}
                enrollmentId={enrollment.id}
                signerRole={definition.signerRole}
                clearanceType={definition.clearanceType}
                signerLabel={definition.signerLabel}
                signerName={formatName(profile.first_name, profile.last_name)}
                title={`${definition.label} — ${definition.signerLabel} E-Signature`}
                description={`Only an account with an active ${definition.signerLabel} assignment may sign this separate clearance.`}
                signedSignature={signedSignature}
                savedSignature={signatureSpecimen}
              />
            );
          })}
        </div> : null}
      </div>
      <RegistrationForm
        enrollment={presentationEnrollment}
        studentPledgeCovered={studentPledgeCovered}
        registrationPledgeVersion={enrollment.registration_pledge_version ?? null}
      />
    </div>
  );
}
