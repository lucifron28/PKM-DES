export const actionCalls: string[] = [];
export async function bulkReviewEnrollmentsAction() { actionCalls.push("review"); }
export async function pullOutEnrollmentsAction() { actionCalls.push("pull_out"); }
export async function reinstateEnrollmentsAction() { actionCalls.push("reinstate"); }
