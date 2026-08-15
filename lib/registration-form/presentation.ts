import type { EnrollmentReviewStatus, SignatureClearanceType, Subject } from "@/types/database";

export type RegistrationLoadItem = Pick<Subject, "id" | "course_code" | "course_description" | "units"> & {
  source?: "legacy_subject" | "course_offering" | "snapshot";
};

export type RegistrationClassificationMarks = {
  newStudent: boolean;
  oldStudent: boolean;
  transferee: boolean;
  regular: boolean;
  irregular: boolean;
};

export const REGISTRATION_FORM_SUBJECT_ROW_COUNT = 10;

export const REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS = [
  "Admission Fee",
  "Athletic Fee",
  "Computer Fee",
  "Cultural Fee",
  "Development Fee",
  "Entrance Fee",
  "Guidance Fee",
  "Handbook Fee",
  "Laboratory Fee",
  "Library Fee",
  "Medical and Dental Fee",
  "Registration Fee",
  "School ID Fee"
] as const;

export const REGISTRATION_FORM_SIGNATURE_BLOCKS = [
  { label: "Student", clearanceType: "STUDENT_ENROLLMENT_SIGNATURE" },
  { label: "Librarian", clearanceType: "LIBRARY_CLEARANCE" },
  { label: "School Nurse", clearanceType: "HEALTH_CLEARANCE" },
  { label: "Program Chair", clearanceType: "PROGRAM_CLEARANCE" },
  { label: "Accountant", clearanceType: "ACCOUNTING_CLEARANCE" },
  { label: "Dean", clearanceType: "DEAN_CLEARANCE" }
] as const satisfies ReadonlyArray<{ label: string; clearanceType: SignatureClearanceType }>;

export const REGISTRATION_FORM_SIGNATURE_LABELS = REGISTRATION_FORM_SIGNATURE_BLOCKS.map((block) => block.label);

export const REGISTRATION_FORM_SOURCE_SECTIONS = [
  "REGISTRATION FORM",
  "ASSESSMENT OF TUITION AND OTHER SCHOOL FEES (TOSF)",
  "MISCELLANEOUS FEE:",
  "TUITION FEE:",
  "NSTP FEE (CWTS):",
  "TOTAL TOSF:",
  "SCHOLARSHIP:"
] as const;

const emptyMarks: RegistrationClassificationMarks = {
  newStudent: false,
  oldStudent: false,
  transferee: false,
  regular: false,
  irregular: false
};

export function getRegistrationClassificationMarks(studentType?: string | null): RegistrationClassificationMarks {
  switch (studentType) {
    case "Incoming 1st Year Student":
      return { ...emptyMarks, newStudent: true };
    case "Transferee":
      return { ...emptyMarks, transferee: true };
    case "Old Student":
    case "Continuing Student":
      return { ...emptyMarks, oldStudent: true };
    case "Regular Student":
      return { ...emptyMarks, oldStudent: true, regular: true };
    case "Irregular Student":
      return { ...emptyMarks, oldStudent: true, irregular: true };
    default:
      return emptyMarks;
  }
}

export function getAcademicClassificationLabel(studentType?: string | null) {
  if (studentType === "Regular Student") {
    return "Regular";
  }

  if (studentType === "Irregular Student") {
    return "Irregular";
  }

  return "For Registrar classification";
}

function compareDisplayText(left: string, right: string) {
  const normalizedLeft = left.trim().toUpperCase();
  const normalizedRight = right.trim().toUpperCase();

  if (normalizedLeft === normalizedRight) {
    return 0;
  }

  return normalizedLeft < normalizedRight ? -1 : 1;
}

export function sortRegistrationSubjects(subjects: RegistrationLoadItem[]) {
  return [...subjects].sort((left, right) => {
    const byCode = compareDisplayText(left.course_code, right.course_code);
    if (byCode !== 0) {
      return byCode;
    }

    const byDescription = compareDisplayText(left.course_description, right.course_description);
    if (byDescription !== 0) {
      return byDescription;
    }

    return compareDisplayText(left.id, right.id);
  });
}

export function getRegistrationTotalUnits(subjects: Pick<RegistrationLoadItem, "units">[]) {
  return subjects.reduce((total, subject) => total + (Number.isFinite(subject.units) ? subject.units : 0), 0);
}

export function canStudentPrintRegistrationForm(status?: EnrollmentReviewStatus | null) {
  return status === "APPROVED";
}
