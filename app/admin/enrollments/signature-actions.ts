"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import { recordOfficialClearanceSignature, verifyHealthClearance } from "@/lib/signatures/service";

function revalidateSignatureViews(enrollmentId: string) {
  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student/enrollment-status");
  revalidatePath("/student/cor");
  revalidatePath("/admin/health-records");
  revalidatePath("/admin/dashboard");
}

export async function applyOfficialClearanceSignatureAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase } = await requireRole("admin");
  const result = await recordOfficialClearanceSignature(supabase, formData);

  if (result.success) revalidateSignatureViews(String(formData.get("enrollment_id") ?? "").trim());
  return result;
}

export async function verifyHealthClearanceAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase } = await requireRole("admin");
  const result = await verifyHealthClearance(supabase, formData);

  if (result.success) revalidateSignatureViews(String(formData.get("enrollment_id") ?? "").trim());
  return result;
}
