"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ACADEMIC_YEAR_OPTIONS, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { requireRole, getStudentForProfile } from "@/lib/auth/session";
import type { Semester, YearLevel } from "@/types/database";

export type EnrollmentState = {
  message?: string;
};

export async function submitEnrollmentAction(
  _previousState: EnrollmentState,
  formData: FormData
): Promise<EnrollmentState> {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return { message: "Student record not found." };
  }

  const programId = String(formData.get("program_id") ?? "");
  const yearLevel = String(formData.get("year_level") ?? "") as YearLevel;
  const academicYear = String(formData.get("academic_year") ?? "");
  const semester = String(formData.get("semester") ?? "") as Semester;
  const certified = formData.get("certified") === "on";

  if (!certified) {
    return { message: "Please certify that the information provided is correct." };
  }

  if (programId !== student.program_id || !YEAR_LEVELS.includes(yearLevel) || !ACADEMIC_YEAR_OPTIONS.includes(academicYear) || !SEMESTERS.includes(semester)) {
    return { message: "Please review the academic information before submitting." };
  }

  const { error: enrollmentError } = await supabase.from("enrollments").insert({
    student_id: student.id,
    program_id: programId,
    year_level: yearLevel,
    academic_year: academicYear,
    semester,
    status: "PENDING"
  });

  if (enrollmentError) {
    return { message: "Enrollment request could not be submitted. Please try again." };
  }

  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/enrollment-status");
  redirect("/student/enrollment-status");
}
