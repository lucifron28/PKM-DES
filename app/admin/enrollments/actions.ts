"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeRejectionRemarks,
  type EnrollmentReviewDecision
} from "@/lib/enrollment/admin-review";
import {
  getRequirementApplicability,
  isRequirementCode,
  isRequirementStatus,
  isRequirementUuid,
  isValidRequirementTerm,
  normalizeRequirementNote
} from "@/lib/requirements/rules";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";
import type { Enrollment, Student } from "@/types/database";

export type RequirementUpdateState = {
  message?: string;
  success?: boolean;
};

type RequirementUpdateRpcResult = {
  outcome: "updated" | "not_applicable" | "not_found" | "invalid_request" | "unauthorized";
  requirement_id: string | null;
  requirement_status: RequirementStatus | null;
  applicability: RequirementApplicability | null;
};

function revalidateEnrollmentViews(enrollmentId: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/enrollment-status");
  revalidatePath("/student/cor");
}

async function processEnrollmentReview(formData: FormData, decision: EnrollmentReviewDecision) {
  const { supabase } = await requireRole("admin");
  const enrollmentId = normalizeEnrollmentReviewId(formData.get("enrollment_id"));

  if (!enrollmentId) {
    redirect("/admin/enrollments?error=invalid_request");
  }

  const remarks = decision === "REJECTED" ? normalizeRejectionRemarks(formData.get("remarks")) : null;
  const { data, error } = await supabase.rpc("review_pending_enrollment", {
    p_enrollment_id: enrollmentId,
    p_decision: decision,
    p_remarks: remarks
  });

  if (error) {
    console.error("enrollment_review:review_rpc");
    redirect("/admin/enrollments?error=review_failed");
  }

  const result = Array.isArray(data) ? data[0] : null;
  const redirectResult = getEnrollmentReviewRedirect(String(result?.outcome ?? ""));

  if (redirectResult.kind === "success") {
    try {
      revalidateEnrollmentViews(enrollmentId);
    } catch {
      console.error("enrollment_review:review_revalidation");
    }
    redirect(`/admin/enrollments?success=${redirectResult.value}`);
  }

  if (redirectResult.value === "already_reviewed") {
    revalidatePath("/admin/enrollments");
  }

  console.error("enrollment_review:review_result");
  redirect(`/admin/enrollments?error=${redirectResult.value}`);
}

export async function approveEnrollmentAction(formData: FormData) {
  await processEnrollmentReview(formData, "APPROVED");
}

export async function rejectEnrollmentAction(formData: FormData) {
  await processEnrollmentReview(formData, "REJECTED");
}

export async function updateEnrollmentRequirementAction(
  _previousState: RequirementUpdateState,
  formData: FormData
): Promise<RequirementUpdateState> {
  const { supabase } = await requireRole("admin");
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const requirementCode = String(formData.get("requirement_code") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = normalizeRequirementNote(formData.get("note"));

  if (!isRequirementUuid(enrollmentId) || !isRequirementCode(requirementCode) || !isRequirementStatus(status) || !note.valid) {
    return { message: "Requirement status could not be updated. Please try again." };
  }

  const { data: enrollmentData, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, student_id, academic_year, semester, status")
    .eq("id", enrollmentId)
    .maybeSingle();
  const enrollment = enrollmentData as Pick<Enrollment, "id" | "student_id" | "academic_year" | "semester" | "status"> | null;

  if (enrollmentError || !enrollment || enrollment.status !== "PENDING" || !isValidRequirementTerm({
    academicYear: enrollment.academic_year,
    semester: enrollment.semester
  })) {
    console.error("requirement_status:enrollment_validation");
    return { message: "Requirement status could not be updated. Please try again." };
  }

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("id, student_id_number, student_type")
    .eq("id", enrollment.student_id)
    .maybeSingle();
  const student = studentData as Pick<Student, "id" | "student_id_number" | "student_type"> | null;

  if (studentError || !student?.student_id_number) {
    console.error("requirement_status:student_validation");
    return { message: "Requirement status could not be updated. Please try again." };
  }

  const { data: officialRecord, error: officialRecordError } = await supabase
    .from("official_student_records")
    .select("gender_sex")
    .eq("student_id_number", student.student_id_number)
    .maybeSingle();

  if (officialRecordError) {
    console.error("requirement_status:official_record_load");
    return { message: "Requirement status could not be updated. Please try again." };
  }

  if (getRequirementApplicability(requirementCode, {
    student_type: student.student_type,
    official_gender_sex: officialRecord?.gender_sex ?? null
  }) !== "APPLICABLE") {
    return { message: "No Health Record Update verification is required for this student and term." };
  }

  const { data, error } = await supabase.rpc("update_enrollment_requirement_status", {
    p_enrollment_id: enrollmentId,
    p_requirement_code: requirementCode,
    p_status: status,
    p_note: note.note
  });
  const result = (data as RequirementUpdateRpcResult[] | null)?.[0];

  if (error || !result) {
    console.error("requirement_status:rpc");
    return { message: "Requirement status could not be updated. Please try again." };
  }

  if (result.outcome === "not_applicable") {
    return { message: "No Health Record Update verification is required for this student and term." };
  }

  if (result.outcome !== "updated") {
    console.error("requirement_status:rpc_outcome");
    return { message: "Requirement status could not be updated. Please try again." };
  }

  revalidateEnrollmentViews(enrollmentId);
  return { success: true, message: "Health Record Update status saved." };
}
