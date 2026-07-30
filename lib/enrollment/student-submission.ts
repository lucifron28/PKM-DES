import { CURRENT_ENROLLMENT_TERM, PROGRAM, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { Semester, StudentType, YearLevel } from "@/types/database";

export type StandardLoadEligibility =
  | "eligible"
  | "registrar_managed_load"
  | "unsupported_program"
  | "missing_student_id"
  | "invalid_student_record"
  | "no_configured_subjects";

export type StudentSubmissionOutcome =
  | StandardLoadEligibility
  | "term_not_open"
  | "term_unavailable"
  | "duplicate"
  | "submitted"
  | "submission_failed";

export type TrustedStudentEnrollmentContext = {
  studentIdNumber: string | null;
  programId: string;
  programCode: string | null;
  yearLevel: string;
  studentType: StudentType;
  matchingSubjectCount: number;
};

export type StudentEnrollmentFormInput = {
  certified: boolean;
};

const STANDARD_LOAD_TYPES: StudentType[] = [
  "Incoming 1st Year Student",
  "Old Student",
  "Continuing Student",
  "Regular Student"
];

const REGISTRAR_MANAGED_TYPES: StudentType[] = ["Transferee", "Irregular Student"];

export const STUDENT_SUBMISSION_MESSAGES: Record<StudentSubmissionOutcome, string> = {
  eligible: "",
  registrar_managed_load:
    "Your subject load requires Registrar review and assignment. Online standard-load submission is not available for this student classification.",
  unsupported_program: "Online enrollment submission is not yet configured for your program. Please contact the Registrar.",
  missing_student_id: "Your student record needs a Student ID before online enrollment can be submitted. Please contact the Registrar.",
  invalid_student_record: "Your student record could not be used for online enrollment. Please contact the Registrar.",
  no_configured_subjects: "No subjects are configured for your recorded year level and the current semester.",
  term_not_open: "Online enrollment is not available for the configured academic term. Please contact the Registrar.",
  term_unavailable: "No active enrollment term is currently configured. Please contact the Registrar.",
  duplicate: "You already have an enrollment request for this academic year and semester.",
  submitted: "",
  submission_failed: "Enrollment request could not be completed. Please try again."
};

export function isStoredYearLevel(value: string): value is YearLevel {
  return YEAR_LEVELS.includes(value as YearLevel);
}

export function isCurrentEnrollmentTerm({
  academicYear,
  semester
}: {
  academicYear: string;
  semester: string;
}) {
  return (
    academicYear === CURRENT_ENROLLMENT_TERM.academicYear &&
    semester === (CURRENT_ENROLLMENT_TERM.semester as Semester)
  );
}

export function evaluateStandardLoadEligibility(
  context: TrustedStudentEnrollmentContext
): StandardLoadEligibility {
  if (!context.programId || !isStoredYearLevel(context.yearLevel)) {
    return "invalid_student_record";
  }

  if (!context.studentIdNumber?.trim()) {
    return "missing_student_id";
  }

  if (REGISTRAR_MANAGED_TYPES.includes(context.studentType)) {
    return "registrar_managed_load";
  }

  if (!STANDARD_LOAD_TYPES.includes(context.studentType)) {
    return "invalid_student_record";
  }

  if (context.programCode !== PROGRAM.code) {
    return "unsupported_program";
  }

  if (context.matchingSubjectCount < 1) {
    return "no_configured_subjects";
  }

  return "eligible";
}

export function getStudentSubmissionMessage(outcome: Exclude<StudentSubmissionOutcome, "eligible" | "submitted">) {
  return STUDENT_SUBMISSION_MESSAGES[outcome];
}

export function isStudentSubmissionOutcome(value: string): value is StudentSubmissionOutcome {
  return value in STUDENT_SUBMISSION_MESSAGES;
}

export function shouldRedirectAfterStudentSubmission(outcome: StudentSubmissionOutcome) {
  return outcome === "submitted";
}
