"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeRejectionRemarks,
  type EnrollmentReviewDecision
} from "@/lib/enrollment/admin-review";

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
  const { supabase } = await requireRole("admin");
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
    redirect(`/admin/enrollments?success=${redirectResult.value}`);
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
