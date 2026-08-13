import type { OfficialSignerRole, SignatureClearanceType } from "@/types/database";
import {
  CLEARANCE_DEFINITIONS,
  getClearanceDefinition,
  getClearanceDefinitionForRole
} from "@/lib/signatures/clearances";

/**
 * The primary account role remains `admin`; these are capabilities attached
 * to an authenticated admin/staff profile for a specific signing capacity.
 */
export const OFFICIAL_SIGNER_ROLES: readonly OfficialSignerRole[] = CLEARANCE_DEFINITIONS
  .filter((definition) => definition.signerRole !== "STUDENT")
  .map((definition) => definition.signerRole as OfficialSignerRole);

export const OFFICIAL_ROLE_LABELS: Record<OfficialSignerRole, string> = {
  LIBRARIAN: "Librarian",
  NURSE: "School Nurse",
  PROGRAM_CHAIR: "Program Chair",
  ACCOUNTANT: "Accountant",
  DEAN: "Dean"
};

export function isOfficialSignerRole(value: string): value is OfficialSignerRole {
  return OFFICIAL_SIGNER_ROLES.includes(value as OfficialSignerRole);
}

export function requiredOfficialRoleForClearance(clearanceType: string): OfficialSignerRole | null {
  const definition = getClearanceDefinition(clearanceType);
  if (!definition || definition.signerRole === "STUDENT") return null;
  return definition.signerRole;
}

export function clearanceTypeForOfficialRole(role: OfficialSignerRole): SignatureClearanceType {
  return getClearanceDefinitionForRole(role)?.clearanceType ?? "DEAN_CLEARANCE";
}
