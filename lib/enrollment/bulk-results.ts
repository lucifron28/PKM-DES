export type BulkEnrollmentResult = {
  outcome: string;
  enrollment_id: string | null;
};

export function validateBulkEnrollmentResults(data: unknown, requestedIds: string[]) {
  if (!Array.isArray(data) || data.length === 0 || requestedIds.length === 0) return null;
  const rows = data as BulkEnrollmentResult[];
  if (
    rows.length === 1 &&
    rows[0]?.enrollment_id === null &&
    ["unauthorized", "invalid_request"].includes(rows[0].outcome)
  ) return rows;

  const requested = new Set(requestedIds);
  if (requested.size !== requestedIds.length || rows.length !== requested.size) return null;

  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row.outcome !== "string" || typeof row.enrollment_id !== "string") return null;
    if (!requested.has(row.enrollment_id) || seen.has(row.enrollment_id)) return null;
    seen.add(row.enrollment_id);
  }
  return seen.size === requested.size ? rows : null;
}

export function getBulkResultsError(data: unknown) {
  return data == null || (Array.isArray(data) && data.length === 0)
    ? "no_results"
    : "invalid_rpc_results";
}

export function getBulkRpcFailureCode(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const { code, message } = error as { code?: unknown; message?: unknown };
  const errorCode = typeof code === "string" ? code : "";
  const errorMessage = typeof message === "string" ? message : "";
  if (
    errorCode === "42501" ||
    errorCode === "PGRST301" ||
    /permission denied|unauthorized|authentication required/i.test(errorMessage)
  ) return "unauthorized";
  if (
    errorCode === "P0002" ||
    /enrollment (record )?not found/i.test(errorMessage)
  ) return "not_found";
  return fallback;
}

export function getBulkFailureCode(results: BulkEnrollmentResult[] | null) {
  if (!results?.length) return "no_results";
  if (results.some((result) => result.outcome === "unauthorized")) return "unauthorized";
  if (results.some((result) => result.outcome === "invalid_request")) return "invalid_request";
  if (results.some((result) => result.outcome === "not_found")) return "not_found";
  if (results.some((result) => result.outcome === "incomplete_clearances")) return "incomplete_clearances";
  if (results.every((result) => result.outcome === "already_pulled_out")) return "already_pulled_out";
  if (results.every((result) => result.outcome === "history_unavailable")) return "history_unavailable";
  return "no_eligible_records";
}

export function summarizeSkippedResults(results: BulkEnrollmentResult[], successfulOutcome: string) {
  const counts = new Map<string, number>();
  for (const result of results) {
    if (result.outcome !== successfulOutcome) counts.set(result.outcome, (counts.get(result.outcome) ?? 0) + 1);
  }
  const labels: Record<string, string> = {
    already_reviewed: "already reviewed",
    already_pulled_out: "already marked PULL OUT",
    incomplete_clearances: "approved records need current signatures",
    invalid_enrollment_load: "enrollment load needs correction",
    invalid_request: "invalid request",
    not_eligible: "no longer eligible",
    not_found: "not found",
    unauthorized: "not authorized",
    unverified_requirements: "requirements are not verified",
    history_unavailable: "previous status unavailable"
  };
  return [...counts]
    .map(([outcome, count]) => `${count} ${labels[outcome] ?? "not processed"}`)
    .join("; ");
}
