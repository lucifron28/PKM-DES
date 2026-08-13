import type { RequirementApplicability } from "@/lib/requirements/types";
import type {
  EnrollmentClearanceStatus,
  OfficialSignerRole,
  SignatureClearanceType,
  SignatureDocumentType,
  SignerRole
} from "@/types/database";

export type ClearanceDefinition = {
  clearanceType: SignatureClearanceType;
  signerRole: SignerRole;
  label: string;
  signerLabel: string;
  documentType: SignatureDocumentType;
  required: boolean;
};

export const CLEARANCE_DEFINITIONS: readonly ClearanceDefinition[] = [
  {
    clearanceType: "STUDENT_ENROLLMENT_SIGNATURE",
    signerRole: "STUDENT",
    label: "Student Signature",
    signerLabel: "Student",
    documentType: "ENROLLMENT_REGISTRATION",
    required: true
  },
  {
    clearanceType: "LIBRARY_CLEARANCE",
    signerRole: "LIBRARIAN",
    label: "Library Clearance",
    signerLabel: "Librarian",
    documentType: "ENROLLMENT_CLEARANCE",
    required: true
  },
  {
    clearanceType: "HEALTH_CLEARANCE",
    signerRole: "NURSE",
    label: "Health Clearance",
    signerLabel: "School Nurse",
    documentType: "HEALTH_RECORD",
    required: true
  },
  {
    clearanceType: "PROGRAM_CLEARANCE",
    signerRole: "PROGRAM_CHAIR",
    label: "Program Clearance",
    signerLabel: "Program Chair",
    documentType: "ENROLLMENT_CLEARANCE",
    required: true
  },
  {
    clearanceType: "ACCOUNTING_CLEARANCE",
    signerRole: "ACCOUNTANT",
    label: "Accounting Clearance",
    signerLabel: "Accountant",
    documentType: "ENROLLMENT_CLEARANCE",
    required: true
  },
  {
    clearanceType: "DEAN_CLEARANCE",
    signerRole: "DEAN",
    label: "Dean Clearance",
    signerLabel: "Dean",
    documentType: "ENROLLMENT_CLEARANCE",
    required: true
  }
];

export function getClearanceDefinition(clearanceType: string) {
  return CLEARANCE_DEFINITIONS.find((definition) => definition.clearanceType === clearanceType) ?? null;
}

export function getClearanceDefinitionForRole(role: OfficialSignerRole) {
  return CLEARANCE_DEFINITIONS.find((definition) => definition.signerRole === role) ?? null;
}

export function isValidOfficialRoleClearance(role: string, clearanceType: string) {
  const definition = getClearanceDefinition(clearanceType);
  return Boolean(definition && definition.signerRole === role && role !== "STUDENT");
}

export type ClearanceSignatureEvidence = {
  exists: boolean;
  isCurrent: boolean;
  signerName?: string | null;
  signedAt?: string | null;
  signedUrl?: string | null;
  inputType?: "DRAWN";
};

export type ClearanceOverviewItem = ClearanceDefinition & {
  status: EnrollmentClearanceStatus;
  evidence: ClearanceSignatureEvidence;
};

export type ClearanceOverallStatus = "COMPLETE" | "INCOMPLETE" | "BLOCKED";

export function getEnrollmentClearanceOverview(
  healthApplicability: RequirementApplicability | null | undefined,
  evidenceByClearance: Partial<Record<SignatureClearanceType, ClearanceSignatureEvidence>>
): ClearanceOverviewItem[] {
  return CLEARANCE_DEFINITIONS.map((definition) => {
    const evidence = evidenceByClearance[definition.clearanceType] ?? { exists: false, isCurrent: false };
    const notApplicable = definition.clearanceType === "HEALTH_CLEARANCE" && healthApplicability === "NOT_APPLICABLE";
    const applicabilityUnknown = definition.clearanceType === "HEALTH_CLEARANCE" && healthApplicability == null;
    const status: EnrollmentClearanceStatus = notApplicable
      ? "NOT_APPLICABLE"
      : applicabilityUnknown
        ? "PENDING"
      : !evidence.exists
        ? "PENDING"
        : evidence.isCurrent
          ? "SIGNED"
          : "INVALIDATED";

    return { ...definition, status, evidence };
  });
}

export function getEnrollmentClearanceOverallStatus(items: ClearanceOverviewItem[]): ClearanceOverallStatus {
  if (items.some((item) => item.status === "INVALIDATED")) return "BLOCKED";
  return items.every((item) => !item.required || item.status === "SIGNED" || item.status === "NOT_APPLICABLE")
    ? "COMPLETE"
    : "INCOMPLETE";
}
