export type EnrollmentReviewDecision = "APPROVED" | "REJECTED";

export type EnrollmentReviewOutcome =
  | "approved"
  | "rejected"
  | "not_found"
  | "already_reviewed"
  | "invalid_request"
  | "unauthorized"
  | "review_failed"
  | "invalid_enrollment_load"
  | "unverified_requirements";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeEnrollmentReviewId(value: FormDataEntryValue | null) {
  const enrollmentId = String(value ?? "").trim();
  return UUID_PATTERN.test(enrollmentId) ? enrollmentId : null;
}

export function normalizeRejectionRemarks(value: FormDataEntryValue | null) {
  const remarks = String(value ?? "").trim();
  return remarks || null;
}

export function isEnrollmentReviewOutcome(value: string): value is EnrollmentReviewOutcome {
  return [
    "approved",
    "rejected",
    "not_found",
    "already_reviewed",
    "invalid_request",
    "unauthorized",
    "review_failed",
    "invalid_enrollment_load",
    "unverified_requirements"
  ].includes(value);
}

export function getEnrollmentReviewRedirect(outcome: string) {
  if (!isEnrollmentReviewOutcome(outcome)) return { kind: "error" as const, value: "review_failed" };
  if (outcome === "approved" || outcome === "rejected") return { kind: "success" as const, value: outcome };
  if (outcome === "already_reviewed") return { kind: "error" as const, value: outcome };
  if (outcome === "not_found" || outcome === "invalid_request" || outcome === "invalid_enrollment_load" || outcome === "unverified_requirements") return { kind: "error" as const, value: outcome };

  return { kind: "error" as const, value: "review_failed" };
}
