import type { AccountStatus } from "@/types/database";

export type AccountMatchCandidate = {
  profileId: string;
  accountStatus: AccountStatus | null;
};

export type OfficialRecordAccountMatch = {
  state: "exact" | "email_only" | "student_id_only" | "conflict" | "none" | "unavailable";
  accountStatus: AccountStatus | null;
};

export const ACCOUNT_MATCH_LABELS: Record<OfficialRecordAccountMatch["state"], string> = {
  exact: "Exact account match",
  email_only: "Email match only",
  student_id_only: "Student ID match only",
  conflict: "Identity conflict",
  none: "No account",
  unavailable: "Account match unavailable"
};

export function normalizeOfficialRecordEmail(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeOfficialRecordStudentId(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeOfficialRecordSearch(value: string | null | undefined) {
  return String(value ?? "").trim().slice(0, 100);
}

function escapePostgrestLikeValue(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[,.()]/g, "\\$&")
    .replace(/[%_*]/g, "\\$&");
}

export function buildOfficialRecordSearchFilter(value: string | null | undefined) {
  const search = normalizeOfficialRecordSearch(value);
  if (!search) return null;

  const pattern = `*${escapePostgrestLikeValue(search)}*`;
  return ["first_name", "last_name", "email", "student_id_number"]
    .map((field) => `${field}.ilike."${pattern}"`)
    .join(",");
}

export function parsePositivePage(value: string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;

  return Math.max(1, Math.floor(parsed));
}

function uniqueCandidates(candidates: AccountMatchCandidate[]) {
  return [...new Map(candidates.map((candidate) => [candidate.profileId, candidate])).values()];
}

export function resolveOfficialRecordAccountMatch({
  emailMatches,
  studentIdMatches,
  unavailable = false
}: {
  emailMatches: AccountMatchCandidate[];
  studentIdMatches: AccountMatchCandidate[];
  unavailable?: boolean;
}): OfficialRecordAccountMatch {
  if (unavailable) return { state: "unavailable", accountStatus: null };

  const uniqueEmailMatches = uniqueCandidates(emailMatches);
  const uniqueStudentIdMatches = uniqueCandidates(studentIdMatches);

  if (uniqueEmailMatches.length > 1 || uniqueStudentIdMatches.length > 1) {
    return { state: "conflict", accountStatus: null };
  }

  const emailMatch = uniqueEmailMatches[0];
  const studentIdMatch = uniqueStudentIdMatches[0];

  if (emailMatch && studentIdMatch) {
    if (emailMatch.profileId !== studentIdMatch.profileId) {
      return { state: "conflict", accountStatus: null };
    }

    return { state: "exact", accountStatus: emailMatch.accountStatus };
  }

  if (emailMatch) return { state: "email_only", accountStatus: emailMatch.accountStatus };
  if (studentIdMatch) return { state: "student_id_only", accountStatus: studentIdMatch.accountStatus };

  return { state: "none", accountStatus: null };
}
