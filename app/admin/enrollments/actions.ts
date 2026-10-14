"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeEnrollmentReviewIds,
  normalizeRejectionRemarks,
  type EnrollmentReviewDecision
} from "@/lib/enrollment/admin-review";
import {
  getBulkFailureCode,
  getBulkResultsError,
  getBulkRpcFailureCode,
  summarizeSkippedResults,
  validateBulkEnrollmentResults
} from "@/lib/enrollment/bulk-results";
import {
  processEnrollmentReviewNotification,
  sendEnrollmentDecisionEmailService,
  type EnrollmentDecisionEmailDelivery
} from "@/lib/email/enrollment-decision";

export type RequirementUpdateState = {
  message?: string;
  success?: boolean;
};

function revalidateEnrollmentViews(enrollmentId: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
  revalidatePath("/admin/reports");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/enrollment-status");
  revalidatePath("/student/cor");
}

async function processEnrollmentReview(formData: FormData, decision: EnrollmentReviewDecision) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentId = normalizeEnrollmentReviewId(formData.get("enrollment_id"));

  if (!enrollmentId) {
    redirect("/admin/enrollments?error=invalid_request");
  }

  const remarks = decision === "REJECTED" ? normalizeRejectionRemarks(formData.get("remarks")) : null;
  const { data, error } = await supabase.rpc("registrar_review_pending_enrollment", {
    p_enrollment_id: enrollmentId,
    p_decision: decision,
    p_remarks: remarks
  });

  if (error) {
    console.error("enrollment_review:review_rpc");
    redirect("/admin/enrollments?error=review_failed");
  }

  const result = Array.isArray(data) ? data[0] : null;
  const redirectResult = getEnrollmentReviewRedirect(String(result?.outcome ?? ""));

  if (redirectResult.kind === "success") {
    try {
      revalidateEnrollmentViews(enrollmentId);
    } catch {
      console.error("enrollment_review:review_revalidation");
    }

    let emailDelivery: EnrollmentDecisionEmailDelivery = "failed";
    try {
      emailDelivery = await processEnrollmentReviewNotification(
        String(result?.outcome ?? ""),
        supabase,
        enrollmentId,
        decision
      ) as EnrollmentDecisionEmailDelivery;
    } catch {
      console.error("enrollment_review:notification_unexpected");
    }

    redirect(`/admin/enrollments?success=${redirectResult.value}&email=${emailDelivery}`);
  }

  if (redirectResult.value === "already_reviewed") {
    revalidatePath("/admin/enrollments");
  }

  console.error("enrollment_review:review_result");
  redirect(`/admin/enrollments?error=${redirectResult.value}`);
}

export async function approveEnrollmentAction(formData: FormData) {
  await processEnrollmentReview(formData, "APPROVED");
}

export async function rejectEnrollmentAction(formData: FormData) {
  await processEnrollmentReview(formData, "REJECTED");
}

function enrollmentListRedirect(formData: FormData, values: Record<string, string>): never {
  const params = new URLSearchParams();
  const academicYear = String(formData.get("academic_year") ?? "").trim();
  const semester = String(formData.get("semester") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (/^\d{4}-\d{4}$/.test(academicYear)) params.set("academic_year", academicYear);
  if (semester === "1st Semester" || semester === "2nd Semester") params.set("semester", semester);
  if (["PENDING", "APPROVED", "REJECTED", "PULLED_OUT"].includes(status)) params.set("status", status);
  for (const [key, value] of Object.entries(values)) params.set(key, value);
  const query = params.toString();
  redirect(`/admin/enrollments${query ? `?${query}` : ""}`);
}

export async function bulkReviewEnrollmentsAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentIds = normalizeEnrollmentReviewIds(formData.getAll("enrollment_ids"));
  const decision = String(formData.get("decision") ?? "").trim();
  const remarks = decision === "REJECTED" ? normalizeRejectionRemarks(formData.get("remarks")) : null;

  if (!enrollmentIds || (decision !== "APPROVED" && decision !== "REJECTED") || (remarks?.length ?? 0) > 2000) {
    enrollmentListRedirect(formData, { error: "invalid_request" });
  }

  const { data, error } = await supabase.rpc("registrar_bulk_review_enrollments", {
    p_enrollment_ids: enrollmentIds,
    p_decision: decision,
    p_remarks: remarks
  });
  if (error) {
    console.error("enrollment_review:bulk_rpc");
    enrollmentListRedirect(formData, { error: getBulkRpcFailureCode(error, "bulk_review_failed") });
  }

  const results = validateBulkEnrollmentResults(data, enrollmentIds);
  if (!results) enrollmentListRedirect(formData, { error: getBulkResultsError(data) });
  const reviewed = results.filter((result) =>
    result.enrollment_id && result.outcome === decision.toLowerCase()
  );
  if (!reviewed.length) {
    enrollmentListRedirect(formData, { error: getBulkFailureCode(results) });
  }

  let emailDelivery: EnrollmentDecisionEmailDelivery = "sent";
  for (const result of reviewed) {
    const enrollmentId = result.enrollment_id as string;
    revalidateEnrollmentViews(enrollmentId);
    try {
      const delivery = await processEnrollmentReviewNotification(
        result.outcome,
        supabase,
        enrollmentId,
        decision as EnrollmentReviewDecision
      ) as EnrollmentDecisionEmailDelivery;
      if (delivery !== "sent") emailDelivery = delivery;
    } catch {
      emailDelivery = "failed";
    }
  }

  enrollmentListRedirect(formData, {
    success: "bulk_reviewed",
    processed: String(reviewed.length),
    skipped: String(results.length - reviewed.length),
    skip_summary: summarizeSkippedResults(results, decision.toLowerCase()),
    email: emailDelivery
  });
}

export async function pullOutEnrollmentsAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentIds = normalizeEnrollmentReviewIds(formData.getAll("enrollment_ids"));
  const reason = normalizeRejectionRemarks(formData.get("reason"));
  if (!enrollmentIds || !reason || reason.length > 2000) {
    enrollmentListRedirect(formData, { error: "invalid_request" });
  }

  const { data, error } = await supabase.rpc("pull_out_enrollments", {
    p_enrollment_ids: enrollmentIds,
    p_reason: reason
  });
  if (error) {
    console.error("enrollment_review:pull_out_rpc");
    enrollmentListRedirect(formData, { error: getBulkRpcFailureCode(error, "pull_out_failed") });
  }

  const results = validateBulkEnrollmentResults(data, enrollmentIds);
  if (!results) enrollmentListRedirect(formData, { error: getBulkResultsError(data) });
  const changed = results.filter((result) => result.outcome === "pulled_out" && result.enrollment_id);
  if (!changed.length) enrollmentListRedirect(formData, { error: getBulkFailureCode(results) });
  changed.forEach((result) => revalidateEnrollmentViews(result.enrollment_id as string));
  const skipped = enrollmentIds.length - changed.length;
  enrollmentListRedirect(formData, {
    success: "pulled_out",
    processed: String(changed.length),
    skipped: String(skipped),
    skip_summary: summarizeSkippedResults(results, "pulled_out")
  });
}

export async function reinstateEnrollmentsAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentIds = normalizeEnrollmentReviewIds(formData.getAll("enrollment_ids"));
  if (!enrollmentIds) enrollmentListRedirect(formData, { error: "invalid_request" });

  const { data, error } = await supabase.rpc("reinstate_enrollments", {
    p_enrollment_ids: enrollmentIds
  });
  if (error) {
    console.error("enrollment_review:reinstate_rpc");
    enrollmentListRedirect(formData, { error: getBulkRpcFailureCode(error, "reinstate_failed") });
  }

  const results = validateBulkEnrollmentResults(data, enrollmentIds);
  if (!results) enrollmentListRedirect(formData, { error: getBulkResultsError(data) });
  const changed = results.filter((result) => result.outcome === "reinstated" && result.enrollment_id);
  if (!changed.length) enrollmentListRedirect(formData, { error: getBulkFailureCode(results) });
  changed.forEach((result) => revalidateEnrollmentViews(result.enrollment_id as string));
  const skipped = enrollmentIds.length - changed.length;
  enrollmentListRedirect(formData, {
    success: "reinstated",
    processed: String(changed.length),
    skipped: String(skipped),
    skip_summary: summarizeSkippedResults(results, "reinstated"),
    ...(results.some((result) => result.outcome === "incomplete_clearances")
      ? { error: "incomplete_clearances" }
      : {})
  });
}

export async function retryEnrollmentDecisionEmailAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentId = normalizeEnrollmentReviewId(formData.get("enrollment_id"));
  const decision = String(formData.get("decision") ?? "").trim();

  if (!enrollmentId || (decision !== "APPROVED" && decision !== "REJECTED")) {
    redirect("/admin/enrollments?error=invalid_request");
  }

  let emailDelivery: EnrollmentDecisionEmailDelivery = "failed";
  try {
    emailDelivery = await sendEnrollmentDecisionEmailService(
      supabase,
      enrollmentId,
      decision as EnrollmentReviewDecision
    );
  } catch {
    console.error("enrollment_review:notification_retry_unexpected");
  }

  revalidateEnrollmentViews(enrollmentId);
  redirect(`/admin/enrollments/${enrollmentId}/registration?email=${emailDelivery}`);
}

export async function updateEnrollmentRequirementAction(
  _previousState: RequirementUpdateState,
  formData: FormData
): Promise<RequirementUpdateState> {
  void formData;
  await requireRegistrarAdmin();
  return { message: "Health Record Update status is read-only here. Use the assigned Nurse verification form." };
}
