import { YEAR_LEVELS } from "@/lib/constants/pkm";
import type { StudentType, YearLevel } from "@/types/database";
import type { StandardLoadAvailability } from "@/lib/enrollment/standard-load";

export type StandardLoadEligibility =
  | "eligible"
  | "registrar_managed_load"
  | "missing_student_id"
  | "invalid_student_record"
  | "no_configured_load"
  | "incomplete_configured_load";

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
  yearLevel: string;
  studentType: StudentType;
  standardLoadAvailability: Exclude<StandardLoadAvailability, "query_failed">;
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
  missing_student_id: "Your student record needs a Student ID before online enrollment can be submitted. Please contact the Registrar.",
  invalid_student_record: "Your student record could not be used for online enrollment. Please contact the Registrar.",
  no_configured_load: "A complete standard subject load is not configured for your program and year level. Please contact the Registrar.",
  incomplete_configured_load: "The standard subject load for your program and year level is incomplete. Please contact the Registrar.",
  term_not_open: "Online enrollment is not available for the configured academic term. Please contact the Registrar.",
  term_unavailable: "No active enrollment term is currently configured. Please contact the Registrar.",
  duplicate: "You already have an enrollment request for this academic year and semester.",
  submitted: "",
  submission_failed: "Enrollment request could not be completed. Please try again."
};

export function isStoredYearLevel(value: string): value is YearLevel {
  return YEAR_LEVELS.includes(value as YearLevel);
}

export function isCurrentEnrollmentTerm(
  term: { academicYear: string; semester: string },
  activeTerm: { academicYear: string; semester: string } | null
) {
  if (!activeTerm) {
    return false;
  }
  return (
    term.academicYear === activeTerm.academicYear &&
    term.semester === activeTerm.semester
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

  if (context.standardLoadAvailability === "not_configured") {
    return "no_configured_load";
  }

  if (context.standardLoadAvailability === "incomplete") {
    return "incomplete_configured_load";
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
