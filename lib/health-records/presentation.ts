import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";

export type HealthVerificationViewState =
  | "NOT_APPLICABLE"
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "LEGACY_VERIFICATION";

export function getHealthVerificationViewState({
  applicability,
  status,
  nurseSignatureIsCurrent
}: {
  applicability: RequirementApplicability;
  status: RequirementStatus;
  nurseSignatureIsCurrent: boolean;
}): HealthVerificationViewState {
  if (applicability === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  if (status === "REJECTED") return "REJECTED";
  if (status === "VERIFIED" && nurseSignatureIsCurrent) return "VERIFIED";
  if (status === "VERIFIED") return "LEGACY_VERIFICATION";
  return "PENDING";
}

export function healthVerificationStateLabel(state: HealthVerificationViewState) {
  switch (state) {
    case "NOT_APPLICABLE":
      return "NOT REQUIRED";
    case "VERIFIED":
      return "VERIFIED";
    case "REJECTED":
      return "REJECTED";
    case "LEGACY_VERIFICATION":
      return "LEGACY VERIFICATION";
    default:
      return "PENDING VERIFICATION";
  }
}

export function healthVerificationStateTone(state: HealthVerificationViewState) {
  if (state === "VERIFIED") return "success" as const;
  if (state === "REJECTED") return "error" as const;
  if (state === "NOT_APPLICABLE") return "neutral" as const;
  return "warning" as const;
}

export function isCurrentHealthVerification({
  applicability,
  status,
  nurseSignatureIsCurrent
}: {
  applicability: RequirementApplicability;
  status: RequirementStatus;
  nurseSignatureIsCurrent: boolean;
}) {
  return getHealthVerificationViewState({ applicability, status, nurseSignatureIsCurrent }) === "VERIFIED";
}
