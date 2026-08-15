import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClearanceOverview } from "@/components/signatures/clearance-overview";
import { ESignatureInput } from "@/components/signatures/e-signature-input";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { retryEnrollmentDecisionEmailAction } from "@/app/admin/enrollments/actions";
import { applyOfficialClearanceSignatureAction } from "@/app/admin/enrollments/signature-actions";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { CLEARANCE_DEFINITIONS, getEnrollmentClearanceOverview } from "@/lib/signatures/clearances";
import { loadEnrollmentSignaturePresentation, signatureEvidenceByClearance } from "@/lib/signatures/presentation";
import { loadCurrentSignatureSpecimen } from "@/lib/signatures/specimens";
import { canSignClearance, loadActiveOfficialRoleAssignments } from "@/lib/official-roles/repository";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import { getHealthVerificationViewState, healthVerificationStateLabel, healthVerificationStateTone } from "@/lib/health-records/presentation";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { formatName } from "@/lib/utils/format";
import type { EnrollmentDecisionNotification } from "@/types/database";

export default async function AdminRegistrationFormPage({
  params,
  searchParams
}: {
  params: Promise<{ enrollmentId: string }>;
  searchParams?: Promise<{ email?: string }>;
}) {
  const { supabase, profile } = await requireRegistrarAdmin();
  const { enrollmentId } = await params;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subject_id, course_offering_id, course_code, course_description, units, subjects(*), course_offerings(*))")
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
    health_requirement_applicability: healthApplicability
  };
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

  return (
    <div className="space-y-4">
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
      <RegistrationForm enrollment={presentationEnrollment} />
    </div>
  );
}
