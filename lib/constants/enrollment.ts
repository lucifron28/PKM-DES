import type { EnrollmentReviewStatus } from "@/types/database";

export const ENROLLMENT_REVIEW_STATUSES: EnrollmentReviewStatus[] = ["PENDING", "APPROVED", "REJECTED", "PULLED_OUT"];

export function getEnrollmentStatusLabel(status: string) {
  return status === "PULLED_OUT" ? "PULL OUT" : status;
}
