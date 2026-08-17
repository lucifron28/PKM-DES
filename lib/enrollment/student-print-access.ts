import type { EnrollmentReviewStatus } from "@/types/database";

export type StudentRegistrationCandidate = {
  id: string;
  student_id?: string;
  academic_year: string;
  semester: string;
  status: EnrollmentReviewStatus;
};

export function canStudentViewRegistrationForm(
  enrollment: Pick<StudentRegistrationCandidate, "student_id" | "status">,
  studentId: string
) {
  return enrollment.student_id === studentId && enrollment.status === "APPROVED";
}

export function studentRegistrationFormHref(enrollmentId: string) {
  return `/student/enrollments/${encodeURIComponent(enrollmentId)}/registration`;
}

export function selectCurrentApprovedRegistration(
  approvedEnrollments: StudentRegistrationCandidate[],
  activeTerm: { academicYear: string; semester: string } | null
) {
  if (approvedEnrollments.length === 1) return approvedEnrollments[0].id;
  if (!activeTerm) return null;
  return approvedEnrollments.find(
    (enrollment) => enrollment.academic_year === activeTerm.academicYear && enrollment.semester === activeTerm.semester
  )?.id ?? null;
}
