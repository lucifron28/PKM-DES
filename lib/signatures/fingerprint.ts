import { createHash } from "node:crypto";
import type { RequirementApplicability } from "@/lib/requirements/types";
import type { SignatureClearanceType, SignatureDocumentType, SignerRole } from "@/types/database";

export type EnrollmentFingerprintSubject = {
  id?: string | null;
  course_code: string;
  course_description: string;
  units: number;
  day?: string | null;
  time?: string | null;
  room?: string | null;
};

export type EnrollmentFingerprintInput = {
  id: string;
  academic_year: string;
  semester: string;
  program_id: string;
  year_level: string;
  registration_pledge_version?: string | null;
  financial_document_version?: number | null;
  medical_document_version?: number | null;
  enrollment_subjects?: EnrollmentFingerprintSubject[] | null;
};

function compareStrings(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalEnrollmentMaterial(
  enrollment: EnrollmentFingerprintInput,
  signerRole: SignerRole,
  clearanceType: SignatureClearanceType,
  documentType: SignatureDocumentType
) {
  const subjects = [...(enrollment.enrollment_subjects ?? [])]
    .map((subject) => ({
      course_code: subject.course_code,
      course_description: subject.course_description,
      units: subject.units
    }))
    .sort((left, right) =>
      compareStrings(left.course_code, right.course_code) ||
      compareStrings(left.course_description, right.course_description) ||
      left.units - right.units
    )
    .map((subject) => `${subject.course_code}|${subject.course_description}|${subject.units}`)
    .join("\n");
  const totalUnits = (enrollment.enrollment_subjects ?? []).reduce((total, subject) => total + subject.units, 0);
  const scheduledSubjects = (enrollment.enrollment_subjects ?? [])
    .map((subject) => ({
      course_code: subject.course_code,
      course_description: subject.course_description,
      units: subject.units,
      day: subject.day?.trim() ?? "",
      time: subject.time?.trim() ?? "",
      room: subject.room?.trim() ?? ""
    }))
    .sort((left, right) =>
      compareStrings(left.course_code, right.course_code) ||
      compareStrings(left.course_description, right.course_description) ||
      left.units - right.units ||
      compareStrings(left.day, right.day) ||
      compareStrings(left.time, right.time) ||
      compareStrings(left.room, right.room)
    );
  const hasSchedule = scheduledSubjects.some((subject) => subject.day || subject.time || subject.room);
  const pledgeVersion =
    signerRole === "STUDENT" &&
    clearanceType === "STUDENT_ENROLLMENT_SIGNATURE" &&
    documentType === "ENROLLMENT_REGISTRATION"
      ? enrollment.registration_pledge_version
      : null;

  const material = [
    "ENROLLMENT",
    `enrollment_id=${enrollment.id}`,
    `academic_year=${enrollment.academic_year}`,
    `semester=${enrollment.semester}`,
    `program_id=${enrollment.program_id}`,
    `year_level=${enrollment.year_level}`,
    `subjects=${subjects}`,
    `total_units=${totalUnits}`,
    `signer_role=${signerRole}`,
    `clearance_type=${clearanceType}`,
    `document_type=${documentType}`
  ];

  if (hasSchedule) {
    material.push(
      `subject_schedules=${scheduledSubjects
        .map((subject) =>
          `${subject.course_code}|${subject.course_description}|${subject.units}|${subject.day}|${subject.time}|${subject.room}`
        )
        .join("\n")}`
    );
  }
  if (pledgeVersion !== null && pledgeVersion !== undefined) {
    material.push(`pledge_policy_version=${pledgeVersion}`);
  }

  return material.join("\n");
}

export function computeEnrollmentDocumentHash(
  enrollment: EnrollmentFingerprintInput,
  signerRole: SignerRole,
  clearanceType: SignatureClearanceType,
  documentType: SignatureDocumentType
) {
  const baseHash = createHash("sha256")
    .update(canonicalEnrollmentMaterial(enrollment, signerRole, clearanceType, documentType), "utf8")
    .digest("hex");
  if (signerRole === "ACCOUNTANT" && clearanceType === "ACCOUNTING_CLEARANCE" &&
      documentType === "ENROLLMENT_CLEARANCE" && (enrollment.financial_document_version ?? 0) > 0) {
    return createHash("sha256").update(`${baseHash}\nfinancial_document_version=${enrollment.financial_document_version}`, "utf8").digest("hex");
  }
  if (signerRole === "NURSE" && clearanceType === "HEALTH_CLEARANCE" &&
      documentType === "ENROLLMENT_CLEARANCE" && (enrollment.medical_document_version ?? 0) > 0) {
    return createHash("sha256").update(`${baseHash}\nmedical_document_version=${enrollment.medical_document_version}`, "utf8").digest("hex");
  }
  return baseHash;
}

export type HealthRecordFingerprintInput = {
  enrollmentId: string;
  studentId: string;
  academicYear: string;
  semester: string;
  applicability: RequirementApplicability;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  medical_document_version?: number | null;
};

export function computeHealthRecordDocumentHash(input: HealthRecordFingerprintInput) {
  const material = [
    "HEALTH_RECORD",
    `enrollment_id=${input.enrollmentId}`,
    `student_id=${input.studentId}`,
    `academic_year=${input.academicYear}`,
    `semester=${input.semester}`,
    "requirement_code=HEALTH_RECORD_UPDATE",
    `applicability=${input.applicability}`,
    `status=${input.status}`,
    "signer_role=NURSE",
    "clearance_type=HEALTH_CLEARANCE",
    "document_type=HEALTH_RECORD"
  ].join("\n");

  const baseHash = createHash("sha256").update(material, "utf8").digest("hex");
  return (input.medical_document_version ?? 0) > 0
    ? createHash("sha256").update(`${baseHash}\nmedical_document_version=${input.medical_document_version}`, "utf8").digest("hex")
    : baseHash;
}
