import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ClearanceOverview } from "@/components/signatures/clearance-overview";
import { ESignatureInput } from "@/components/signatures/e-signature-input";
import { RegistrationForm, type PrintableEnrollment } from "@/components/print/registration-form";
import { applyStudentEnrollmentSignatureAction } from "@/app/student/enrollment/signature-actions";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { getEnrollmentClearanceOverview } from "@/lib/signatures/clearances";
import { loadEnrollmentSignaturePresentation, signatureEvidenceByClearance } from "@/lib/signatures/presentation";
import { formatName } from "@/lib/utils/format";

export default async function StudentExplicitRegistrationFormPage({
  params
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);
  const { enrollmentId } = await params;

  if (studentResult.status === "query_failed") {
    return (
      <EmptyState
        title="Student record could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const student = studentResult.student;

  const { data, error } = await supabase
    .from("enrollments")
    .select("*, students(*, profiles(*), official_student_records(*)), programs(*), enrollment_subjects(id, subject_id, course_offering_id, course_code, course_description, units, subjects(*), course_offerings(*))")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    console.error("registration_form:explicit_student_enrollment_load", error);
    return (
      <EmptyState
        title="Registration form could not be loaded"
        description="Please try again. No registration form is shown until the selected enrollment data is available."
      />
    );
  }

  const enrollment = data as PrintableEnrollment | null;

  if (!enrollment || enrollment.student_id !== student.id) {
    return (
      <EmptyState
        title="Registration form not found."
        description="The requested registration form is unavailable."
      />
    );
  }

  if (enrollment.status !== "APPROVED") {
    return (
      <EmptyState
        title="Registration form unavailable"
        description="Only approved enrollment requests can be printed as a draft registration form."
        action={<ButtonLink href="/student/enrollment-status">View Enrollment Status</ButtonLink>}
      />
    );
  }

  const healthApplicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: enrollment.students?.student_type ?? student.student_type,
    official_gender_sex: enrollment.students?.official_student_records?.gender_sex ?? student.official_student_records?.gender_sex ?? null
  });
  const { data: requirementData, error: requirementError } = await supabase
    .from("student_requirements")
    .select("id, student_id, requirement_code, status, academic_year, semester, applicability, note, verified_at, verified_by, created_at, updated_at")
    .eq("student_id", student.id)
    .eq("requirement_code", "HEALTH_RECORD_UPDATE")
    .eq("academic_year", enrollment.academic_year)
    .eq("semester", enrollment.semester)
    .maybeSingle();
  const requirement = (requirementData as StudentRequirementRecord | null) ?? null;
  const signatureResult = await loadEnrollmentSignaturePresentation(supabase, enrollment, {
    applicability: healthApplicability,
    status: requirement?.status ?? "PENDING"
  });
  if (requirementError) console.error("student_registration:health_requirement_load");
  if (signatureResult.error) console.error("student_registration:signature_load");

  const presentationEnrollment: PrintableEnrollment = {
    ...enrollment,
    enrollment_signatures: signatureResult.signatures,
    health_requirement_applicability: healthApplicability
  };
  const clearanceOverview = getEnrollmentClearanceOverview(
    healthApplicability,
    signatureEvidenceByClearance(signatureResult.signatures)
  );
  const studentSignature = signatureResult.signatures.filter((item) => item.clearance_type === "STUDENT_ENROLLMENT_SIGNATURE").at(-1) ?? null;

  return (
    <div className="space-y-4">
      <div className="print-hidden space-y-4">
        <ClearanceOverview items={clearanceOverview} />
        {signatureResult.error ? null : (
          <ESignatureInput
            action={applyStudentEnrollmentSignatureAction}
            enrollmentId={enrollment.id}
            signerRole="STUDENT"
            clearanceType="STUDENT_ENROLLMENT_SIGNATURE"
            signerLabel="Student"
            signerName={formatName(profile.first_name, profile.last_name)}
            title="Student E-Signature"
            description="Draw your own signature for the student enrollment section. The server binds it to this approved enrollment and current subject load."
            signedSignature={studentSignature ? {
              signerName: studentSignature.signer_name_snapshot,
              signedAt: studentSignature.signed_at,
              signedUrl: studentSignature.signed_url,
              isCurrent: studentSignature.is_current,
              inputType: "DRAWN"
            } : null}
          />
        )}
      </div>
      <RegistrationForm enrollment={presentationEnrollment} />
    </div>
  );
}
