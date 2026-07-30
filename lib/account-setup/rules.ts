import type { AccountStatus, UserRole } from "@/types/database";

type SetupProfile = {
  role: UserRole;
  account_status: AccountStatus;
};

export function isEligibleStudentSetupProfile(profile: SetupProfile | null) {
  return profile?.role === "student" && profile.account_status === "SETUP";
}
