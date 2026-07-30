import type { EnrollmentReviewStatus, Subject } from "@/types/database";

export type RegistrationClassificationMarks = {
  newStudent: boolean;
  oldStudent: boolean;
  transferee: boolean;
  regular: boolean;
  irregular: boolean;
};

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

export function sortRegistrationSubjects(subjects: Subject[]) {
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

export function getRegistrationTotalUnits(subjects: Pick<Subject, "units">[]) {
  return subjects.reduce((total, subject) => total + (Number.isFinite(subject.units) ? subject.units : 0), 0);
}

export function canStudentPrintRegistrationForm(status?: EnrollmentReviewStatus | null) {
  return status === "APPROVED";
}
