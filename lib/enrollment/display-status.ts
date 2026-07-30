import type { EnrollmentReviewStatus, EnrollmentStatus } from "@/types/database";

export type DisplayedEnrollmentStatus = EnrollmentStatus | "REJECTED";

/**
 * Resolves the displayed enrollment status from a current-term enrollment record.
 * Returns null when the caller should handle the absence of a term (not the same as NOT ENROLLED).
 */
export function getDisplayedEnrollmentStatus(
  currentTermStatus: EnrollmentReviewStatus | null
): DisplayedEnrollmentStatus {
  if (!currentTermStatus) {
    return "NOT ENROLLED";
  }

  return currentTermStatus === "APPROVED" ? "ENROLLED" : currentTermStatus;
}

export type ActiveTerm = {
  academicYear: string;
  semester: string;
  label: string;
};

export type TermEnrollmentResult<T> = {
  activeTerm: ActiveTerm | null;
  currentTermEnrollment: T | null;
  historicalEnrollments: T[];
};

/**
 * Extracts current-term and historical enrollment records from a list using the active term.
 * This is a pure helper that does not query the database.
 */
export function separateEnrollmentsByTerm<T extends { academic_year: string; semester: string }>(
  enrollments: T[],
  activeTerm: ActiveTerm | null
): TermEnrollmentResult<T> {
  if (!activeTerm) {
    return {
      activeTerm: null,
      currentTermEnrollment: null,
      historicalEnrollments: enrollments
    };
  }

  const currentTermEnrollment = enrollments.find(
    (e) => e.academic_year === activeTerm.academicYear && e.semester === activeTerm.semester
  ) ?? null;

  const historicalEnrollments = enrollments.filter(
    (e) => e.academic_year !== activeTerm.academicYear || e.semester !== activeTerm.semester
  );

  return {
    activeTerm,
    currentTermEnrollment,
    historicalEnrollments
  };
}
