"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { CURRENT_ENROLLMENT_TERM } from "@/lib/constants/pkm";
import {
  getStudentSubmissionMessage,
  isStudentSubmissionOutcome,
  shouldRedirectAfterStudentSubmission,
  type StudentSubmissionOutcome
} from "@/lib/enrollment/student-submission";

export type EnrollmentState = {
  message?: string;
};

type StudentEnrollmentRpcResult = {
  outcome: StudentSubmissionOutcome;
  enrollment_id: string | null;
  attached_subject_count: number;
};

export async function submitEnrollmentAction(
  _previousState: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  const { supabase } = await requireRole("student");
  const certified = formData.get("certified") === "on";

  if (!certified) {
    return { message: "Please certify that the information provided is correct." };
  }

  const { data, error } = await supabase.rpc("submit_standard_student_enrollment", {
    p_academic_year: CURRENT_ENROLLMENT_TERM.academicYear,
    p_semester: CURRENT_ENROLLMENT_TERM.semester
  });
  const result = (data as StudentEnrollmentRpcResult[] | null)?.[0];

  if (error || !result || !isStudentSubmissionOutcome(result.outcome)) {
    console.error("Student enrollment submission failed.", { stage: "rpc" });
    return { message: getStudentSubmissionMessage("submission_failed") };
  }

  if (shouldRedirectAfterStudentSubmission(result.outcome)) {
    revalidatePath("/student", "layout");
    revalidatePath("/student/dashboard");
    revalidatePath("/student/enrollment-status");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/enrollments");
    revalidatePath("/admin/masterlist");
    revalidatePath("/admin/reports");
    redirect("/student/enrollment-status");
  }

  if (result.outcome === "eligible") {
    return { message: getStudentSubmissionMessage("submission_failed") };
  }

  return { message: getStudentSubmissionMessage(result.outcome) };
}
