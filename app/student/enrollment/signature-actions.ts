"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { recordStudentEnrollmentSignature } from "@/lib/signatures/service";
import type { SignatureActionState } from "@/lib/signatures/action-state";

export async function applyStudentEnrollmentSignatureAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireRole("student");
  const result = await recordStudentEnrollmentSignature(supabase, profile.id, formData);

  if (result.success) {
    const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
    revalidatePath("/student/enrollment-status");
    revalidatePath("/student/cor");
    revalidatePath("/admin/enrollments");
    if (enrollmentId) {
      revalidatePath(`/student/enrollments/${enrollmentId}/registration`);
      revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
    }
  }

  return result;
}
