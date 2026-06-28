"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CURRENT_ENROLLMENT_TERM, YEAR_LEVELS } from "@/lib/constants/pkm";
import { requireRole, getStudentForProfile } from "@/lib/auth/session";
import type { Enrollment, Semester, Subject, YearLevel } from "@/types/database";

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

  if (
    programId !== student.program_id ||
    !YEAR_LEVELS.includes(yearLevel) ||
    academicYear !== CURRENT_ENROLLMENT_TERM.academicYear ||
    semester !== CURRENT_ENROLLMENT_TERM.semester
  ) {
    return { message: "Please review the academic information before submitting." };
  }

  const { data: existingEnrollment, error: duplicateCheckError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", student.id)
    .eq("academic_year", academicYear)
    .eq("semester", semester)
    .limit(1)
    .maybeSingle();

  if (duplicateCheckError) {
    return { message: "Enrollment request could not be submitted. Please try again." };
  }

  if (existingEnrollment) {
    return { message: "You already have an enrollment request for this academic year and semester." };
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      student_id: student.id,
      program_id: programId,
      year_level: yearLevel,
      academic_year: academicYear,
      semester,
      status: "PENDING"
    })
    .select("id")
    .single<Pick<Enrollment, "id">>();

  if (enrollmentError || !enrollment?.id) {
    if (enrollmentError?.code === "23505") {
      return { message: "You already have an enrollment request for this academic year and semester." };
    }

    return { message: "Enrollment request could not be submitted. Please try again." };
  }

  const { data: matchingSubjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id")
    .eq("program_id", programId)
    .eq("year_level", yearLevel)
    .eq("semester", semester)
    .returns<Pick<Subject, "id">[]>();

  if (subjectsError) {
    await supabase.from("enrollments").delete().eq("id", enrollment.id);
    return { message: "Enrollment request could not be completed. Please try again." };
  }

  if (!matchingSubjects?.length) {
    await supabase.from("enrollments").delete().eq("id", enrollment.id);
    return { message: "No subjects are configured for the selected year level and semester." };
  }

  const { error: enrollmentSubjectsError } = await supabase.from("enrollment_subjects").insert(
    matchingSubjects.map((subject) => ({
      enrollment_id: enrollment.id,
      subject_id: subject.id
    }))
  );

  if (enrollmentSubjectsError) {
    await supabase.from("enrollments").delete().eq("id", enrollment.id);
    return { message: "Enrollment request could not be completed. Please try again." };
  }

  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/enrollment-status");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
  redirect("/student/enrollment-status");
}
