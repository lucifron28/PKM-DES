import type { EnrollmentReviewStatus, EnrollmentStatus } from "@/types/database";

export type DisplayedEnrollmentStatus = EnrollmentStatus | "REJECTED";

export function getDisplayedEnrollmentStatus(
  latestEnrollmentStatus: EnrollmentReviewStatus | null,
  fallbackStatus: EnrollmentStatus
): DisplayedEnrollmentStatus {
  if (!latestEnrollmentStatus) {
    return fallbackStatus;
  }

  return latestEnrollmentStatus === "APPROVED" ? "ENROLLED" : latestEnrollmentStatus;
}
