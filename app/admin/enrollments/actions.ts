"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeRejectionRemarks,
  type EnrollmentReviewDecision
} from "@/lib/enrollment/admin-review";
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
  const { data, error } = await supabase.rpc("review_pending_enrollment", {
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
