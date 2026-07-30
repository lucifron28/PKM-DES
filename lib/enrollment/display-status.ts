import type { EnrollmentReviewStatus, EnrollmentStatus } from "@/types/database";

export type DisplayedEnrollmentStatus = EnrollmentStatus | "REJECTED";

export function getDisplayedEnrollmentStatus(
  currentTermStatus: EnrollmentReviewStatus | null
): DisplayedEnrollmentStatus {
  if (!currentTermStatus) {
    return "NOT ENROLLED";
  }

  return currentTermStatus === "APPROVED" ? "ENROLLED" : currentTermStatus;
}
