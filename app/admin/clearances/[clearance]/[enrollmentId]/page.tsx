import { notFound } from "next/navigation";
import { HealthRecordVerificationForm } from "@/components/health/health-record-verification-form";
import { ESignatureInput } from "@/components/signatures/e-signature-input";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { applyOfficialClearanceSignatureAction } from "@/app/admin/enrollments/signature-actions";
import { requireOfficialSignerRole } from "@/lib/auth/session";
import { getHealthVerificationViewState, healthVerificationStateLabel, healthVerificationStateTone } from "@/lib/health-records/presentation";
import { loadHealthRecordUpdate } from "@/lib/health-records/repository";
import { hasActiveOfficialRoleForProgram } from "@/lib/official-roles/repository";
import { getOfficialWorkspaceBySlug } from "@/lib/official-roles/roles";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import { loadEnrollmentSignaturePresentation } from "@/lib/signatures/presentation";
import { loadCurrentSignatureSpecimen } from "@/lib/signatures/specimens";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { formatName } from "@/lib/utils/format";
import type { EnrollmentClearanceStatus } from "@/types/database";
import type { PrintableEnrollment } from "@/components/print/registration-form";

function statusTone(status: EnrollmentClearanceStatus) {
  if (status === "SIGNED") return "success" as const;
  if (status === "INVALIDATED") return "error" as const;
  if (status === "NOT_APPLICABLE") return "neutral" as const;
  return "warning" as const;
}

function statusLabel(status: EnrollmentClearanceStatus) {
  if (status === "SIGNED") return "Signed";
  if (status === "INVALIDATED") return "Invalidated";
  if (status === "NOT_APPLICABLE") return "Not Applicable";
  return "Pending Signature";
}

export default async function OfficialClearanceReviewPage({
  params
}: {
  params: Promise<{ clearance: string; enrollmentId: string }>;
}) {
  const { clearance, enrollmentId } = await params;
  const workspace = getOfficialWorkspaceBySlug(clearance);
  if (!workspace) notFound();

  const { supabase, profile, assignments } = await requireOfficialSignerRole(workspace.role);
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subject_id, course_offering_id, course_code, course_description, units, subjects(*), course_offerings(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    console.error("official_clearance_review:enrollment_load");
    return <EmptyState title="Clearance review is unavailable" description="The selected enrollment could not be loaded safely. Please return to the queue and try again." />;
  }

  const enrollment = data as PrintableEnrollment | null;
  if (!enrollment || !hasActiveOfficialRoleForProgram(assignments, workspace.role, enrollment.program_id)) notFound();

  const healthApplicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: enrollment.students?.student_type ?? "",
    official_gender_sex: enrollment.students?.official_student_records?.gender_sex ?? null
  });
  const requirementResult = workspace.role === "NURSE"
    ? await supabase
        .from("student_requirements")
        .select("id, student_id, requirement_code, status, academic_year, semester, applicability, note, verified_at, verified_by, created_at, updated_at")
        .eq("student_id", enrollment.student_id)
        .eq("requirement_code", "HEALTH_RECORD_UPDATE")
        .eq("academic_year", enrollment.academic_year)
        .eq("semester", enrollment.semester)
        .maybeSingle()
    : { data: null, error: null };
  if (requirementResult.error) console.error("official_clearance_review:health_requirement_load");

  const healthRequirement = (requirementResult.data as StudentRequirementRecord | null) ?? null;
  const healthRecordResult = workspace.role === "NURSE" && healthApplicability === "APPLICABLE"
    ? await loadHealthRecordUpdate(supabase, enrollment.id)
    : { record: null, error: null };
  if (healthRecordResult.error) console.error("official_clearance_review:health_record_load");
  const healthRecord = healthRecordResult.record;
  const signatureResult = await loadEnrollmentSignaturePresentation(supabase, enrollment, {
    applicability: healthApplicability,
    status: healthRequirement?.status ?? "PENDING"
  });
  const latestSignature = signatureResult.signatures
    .filter((signature) => signature.clearance_type === workspace.clearanceType)
    .at(-1) ?? null;
  const studentSignature = signatureResult.signatures
    .filter((signature) => signature.clearance_type === "STUDENT_ENROLLMENT_SIGNATURE")
    .at(-1) ?? null;
  const isSpecialFormRequired = workspace.role === "NURSE" && healthApplicability === "APPLICABLE";
  const isHealthSyncMismatch = isSpecialFormRequired && healthRequirement?.applicability === "NOT_APPLICABLE";
  const clearanceStatus: EnrollmentClearanceStatus = latestSignature?.is_current
    ? "SIGNED"
    : latestSignature
      ? "INVALIDATED"
      : "PENDING";
  const signedSignature = latestSignature
    ? {
        signerName: latestSignature.signer_name_snapshot,
        signedAt: latestSignature.signed_at,
        signedUrl: latestSignature.signed_url,
        isCurrent: latestSignature.is_current,
        inputType: "DRAWN" as const
      }
    : null;
  const signableEnrollment = enrollment.status === "PENDING" || enrollment.status === "APPROVED";
  const canSign = isSpecialFormRequired
    ? enrollment.status === "PENDING" && healthRequirement?.applicability === "APPLICABLE" && Boolean(healthRecord) && (
        healthRequirement.status === "PENDING" ||
        healthRequirement.status === "REJECTED" ||
        (healthRequirement.status === "VERIFIED" && !latestSignature?.is_current)
      )
    : signableEnrollment && !latestSignature?.is_current;
  const canReject = isSpecialFormRequired && enrollment.status === "PENDING" && healthRequirement?.applicability === "APPLICABLE" && Boolean(healthRecord) && !latestSignature?.is_current;
  const healthVerificationState = isSpecialFormRequired
    ? getHealthVerificationViewState({
        applicability: healthRequirement?.applicability ?? healthApplicability,
        status: healthRequirement?.status ?? "PENDING",
        nurseSignatureIsCurrent: Boolean(latestSignature?.is_current)
      })
    : null;
  const signerName = formatName(profile.first_name, profile.last_name);
  const signatureSpecimen = await loadCurrentSignatureSpecimen(supabase, profile.id);
  const studentName = formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name) || "Student name unavailable";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href={`/admin/clearances/${workspace.slug}`} variant="outline">Back to {workspace.label}</ButtonLink>
        <Badge tone={healthVerificationState ? healthVerificationStateTone(healthVerificationState) : statusTone(clearanceStatus)}>{healthVerificationState ? healthVerificationStateLabel(healthVerificationState) : statusLabel(clearanceStatus)}</Badge>
      </div>

      <Card>
        <CardHeader title={`${workspace.label} review`} description={`Focused review for the authenticated ${workspace.signerLabel} assignment.`} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Student</p><p className="mt-1 font-semibold text-slateui-text">{studentName}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Student ID</p><p className="mt-1 font-semibold text-slateui-text">{enrollment.students?.student_id_number ?? "Unavailable"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Program</p><p className="mt-1 font-semibold text-slateui-text">{enrollment.programs?.name ?? "Unavailable"}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Enrollment</p><p className="mt-1 font-semibold text-slateui-text">{enrollment.status}</p></div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-slateui-border pt-4 sm:grid-cols-3">
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Academic year</dt><dd className="mt-1 text-sm font-semibold text-slateui-text">{enrollment.academic_year}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Semester</dt><dd className="mt-1 text-sm font-semibold text-slateui-text">{enrollment.semester}</dd></div>
          <div><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Year level</dt><dd className="mt-1 text-sm font-semibold text-slateui-text">{enrollment.year_level}</dd></div>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Submitted subject load" description="Review the enrollment data bound to the clearance signature." />
        {enrollment.enrollment_subjects?.length ? (
          <div className="overflow-x-auto rounded-md border border-slateui-border">
            <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
              <thead className="bg-slateui-surfaceAlt"><tr><th className="px-4 py-3 font-semibold text-slateui-text">Course</th><th className="px-4 py-3 font-semibold text-slateui-text">Description</th><th className="px-4 py-3 font-semibold text-slateui-text">Units</th></tr></thead>
              <tbody className="divide-y divide-slateui-border bg-white">
                {enrollment.enrollment_subjects.map((subject) => <tr key={subject.id}><td className="px-4 py-3 font-semibold text-slateui-text">{subject.course_code}</td><td className="px-4 py-3 text-slateui-secondary">{subject.course_description}</td><td className="px-4 py-3 text-slateui-secondary">{subject.units}</td></tr>)}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-slateui-secondary">No submitted subject load is available for this enrollment.</p>}
      </Card>

      <Card>
        <CardHeader title={`${workspace.label} evidence`} description={workspace.description} />
        {signatureResult.error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">Signature evidence could not be loaded safely. Signing controls are unavailable until the page is refreshed.</p>
        ) : isHealthSyncMismatch ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900" role="alert">Health clearance status is being synchronized. Please refresh the record.</p>
        ) : isSpecialFormRequired ? (
          <HealthRecordVerificationForm
            enrollmentId={enrollment.id}
            studentName={studentName}
            studentId={enrollment.students?.student_id_number ?? "Unavailable"}
            program={enrollment.programs?.name ?? "Unavailable"}
            yearLevel={enrollment.year_level}
            studentType={enrollment.students?.student_type ?? "Unavailable"}
            academicYear={enrollment.academic_year}
            semester={enrollment.semester}
            applicability={healthRequirement?.applicability ?? healthApplicability}
            status={healthRequirement?.status ?? "PENDING"}
            note={healthRequirement?.note ?? null}
            healthRecord={healthRecord}
            studentSignature={studentSignature ? {
              signerName: studentSignature.signer_name_snapshot,
              signedAt: studentSignature.signed_at,
              signedUrl: studentSignature.signed_url,
              isCurrent: studentSignature.is_current,
              inputType: "DRAWN"
            } : null}
            signerName={signerName}
            signedSignature={signedSignature}
            canVerify={canSign}
            canReject={canReject}
            savedSignature={signatureSpecimen}
          />
        ) : clearanceStatus === "SIGNED" ? (
          <ESignatureInput
            action={applyOfficialClearanceSignatureAction}
            enrollmentId={enrollment.id}
            signerRole={workspace.role}
            clearanceType={workspace.clearanceType}
            signerLabel={workspace.signerLabel}
            signerName={signerName}
            title={`${workspace.label} e-signature`}
            signedSignature={signedSignature}
            savedSignature={signatureSpecimen}
          />
        ) : canSign ? (
          <ESignatureInput
            action={applyOfficialClearanceSignatureAction}
            enrollmentId={enrollment.id}
            signerRole={workspace.role}
            clearanceType={workspace.clearanceType}
            signerLabel={workspace.signerLabel}
            signerName={signerName}
            title={`Apply ${workspace.label} e-signature`}
            description={`Draw your signature to create the immutable ${workspace.label} evidence for this enrollment.`}
            signedSignature={signedSignature}
            savedSignature={signatureSpecimen}
          />
        ) : (
          <div className="space-y-3">
            {signedSignature ? <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">The previous signature is invalidated because the signed data changed. This enrollment is not currently signable.</p> : null}
            <p className="text-sm text-slateui-secondary">This enrollment is not currently in a signable state.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
