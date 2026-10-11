import type { AccountStatus, UserRole } from "@/types/database";

export type AssignmentTargetProfile = {
  id: string;
  role: UserRole;
  account_status: AccountStatus;
};

/**
 * The research MVP has no super-admin hierarchy. Active admins may manage
 * another admin's official assignments, but the actor can never change their
 * own assignments from the browser.
 */
export function canManageOfficialAssignment(
  actorProfileId: string,
  targetProfile: AssignmentTargetProfile
) {
  return actorProfileId !== targetProfile.id && targetProfile.role === "admin";
}

export function canReceiveActiveOfficialAssignment(targetProfile: AssignmentTargetProfile) {
  return targetProfile.role === "admin" && targetProfile.account_status === "ACTIVE";
}

/**
 * Explicit Registrar capability check.
 * Official Staff accounts whose assignments are revoked never gain
 * Registrar management access unless explicitly designated as a Registrar.
 */
export function hasRegistrarManagementAccess(
  profile: { is_registrar?: boolean | null } | null | undefined
) {
  return Boolean(profile?.is_registrar);
}
