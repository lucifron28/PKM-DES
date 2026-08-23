import type { OfficialSignerRole, SignatureClearanceType } from "@/types/database";
import type { NavigationItem } from "@/lib/constants/navigation";
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

export type OfficialWorkspaceSlug = "library" | "health" | "program" | "accounting" | "dean";

export type OfficialWorkspaceDefinition = {
  role: OfficialSignerRole;
  slug: OfficialWorkspaceSlug;
  clearanceType: SignatureClearanceType;
  label: string;
  navigationLabel: string;
  signerLabel: string;
  description: string;
  pendingDescription: string;
};

export const OFFICIAL_WORKSPACES: Record<OfficialSignerRole, OfficialWorkspaceDefinition> = {
  LIBRARIAN: {
    role: "LIBRARIAN",
    slug: "library",
    clearanceType: "LIBRARY_CLEARANCE",
    label: "Library Clearance",
    navigationLabel: "Library Clearance",
    signerLabel: "Librarian",
    description: "Review enrollment records that are awaiting Librarian confirmation.",
    pendingDescription: "Students awaiting Librarian signature."
  },
  NURSE: {
    role: "NURSE",
    slug: "health",
    clearanceType: "HEALTH_CLEARANCE",
    label: "Health Clearance",
    navigationLabel: "Health Clearance",
    signerLabel: "School Nurse",
    description: "Health Clearance applies to all students, with special Health Record Update verification for Transferees and Incoming 1st Year Female students.",
    pendingDescription: "Students awaiting School Nurse health clearance signature."
  },
  PROGRAM_CHAIR: {
    role: "PROGRAM_CHAIR",
    slug: "program",
    clearanceType: "PROGRAM_CLEARANCE",
    label: "Program Clearance",
    navigationLabel: "Program Clearance",
    signerLabel: "Program Chair",
    description: "Review enrollment records that are awaiting Program Chair confirmation.",
    pendingDescription: "Students awaiting Program Chair signature."
  },
  ACCOUNTANT: {
    role: "ACCOUNTANT",
    slug: "accounting",
    clearanceType: "ACCOUNTING_CLEARANCE",
    label: "Accounting Clearance",
    navigationLabel: "Accounting Clearance",
    signerLabel: "Accountant",
    description: "Review enrollment records that are awaiting Accountant confirmation.",
    pendingDescription: "Students awaiting Accountant signature."
  },
  DEAN: {
    role: "DEAN",
    slug: "dean",
    clearanceType: "DEAN_CLEARANCE",
    label: "Dean Clearance",
    navigationLabel: "Dean Clearance",
    signerLabel: "Dean",
    description: "Review enrollment records that are awaiting Dean confirmation.",
    pendingDescription: "Students awaiting Dean signature."
  }
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

export function getOfficialWorkspace(role: OfficialSignerRole) {
  return OFFICIAL_WORKSPACES[role];
}

export function getOfficialWorkspaceBySlug(slug: string) {
  return OFFICIAL_SIGNER_ROLES
    .map((role) => OFFICIAL_WORKSPACES[role])
    .find((workspace) => workspace.slug === slug) ?? null;
}

export function getOfficialWorkspaceNavigation(
  assignments: ReadonlyArray<{ official_role: OfficialSignerRole; active: boolean }>
): NavigationItem[] {
  const roles = OFFICIAL_SIGNER_ROLES.filter((role) => assignments.some((assignment) => assignment.active && assignment.official_role === role));

  return [
    { label: "Staff Dashboard", href: "/admin/dashboard", icon: "dashboard", section: "Workflow" },
    ...roles.map((role) => {
      const workspace = OFFICIAL_WORKSPACES[role];
      return {
        label: workspace.navigationLabel,
        href: `/admin/clearances/${workspace.slug}`,
        icon: "clearance" as const,
        section: "Workflow" as const
      };
    }),
    { label: "Account", href: "/admin/account", icon: "account", section: "Account" }
  ];
}

export function getAdminLandingDestination(
  assignments: ReadonlyArray<{ official_role: OfficialSignerRole; active: boolean }>
) {
  const roles = OFFICIAL_SIGNER_ROLES.filter((role) => assignments.some((assignment) => assignment.active && assignment.official_role === role));
  if (roles.length === 1) return `/admin/clearances/${OFFICIAL_WORKSPACES[roles[0]].slug}`;
  return "/admin/dashboard";
}
