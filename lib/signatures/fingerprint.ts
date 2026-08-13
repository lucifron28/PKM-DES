import { createHash } from "node:crypto";
import type { RequirementApplicability } from "@/lib/requirements/types";
import type { SignatureClearanceType, SignatureDocumentType, SignerRole } from "@/types/database";

export type EnrollmentFingerprintSubject = {
  id?: string | null;
  course_code: string;
  course_description: string;
  units: number;
};

export type EnrollmentFingerprintInput = {
  id: string;
  academic_year: string;
  semester: string;
  program_id: string;
  year_level: string;
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

  return [
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
  ].join("\n");
}

export function computeEnrollmentDocumentHash(
  enrollment: EnrollmentFingerprintInput,
  signerRole: SignerRole,
  clearanceType: SignatureClearanceType,
  documentType: SignatureDocumentType
) {
  return createHash("sha256")
    .update(canonicalEnrollmentMaterial(enrollment, signerRole, clearanceType, documentType), "utf8")
    .digest("hex");
}

export type HealthRecordFingerprintInput = {
  enrollmentId: string;
  studentId: string;
  academicYear: string;
  semester: string;
  applicability: RequirementApplicability;
  status: "PENDING" | "VERIFIED" | "REJECTED";
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

  return createHash("sha256").update(material, "utf8").digest("hex");
}
