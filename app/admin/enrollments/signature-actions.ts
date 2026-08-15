"use server";

import { revalidatePath } from "next/cache";
import { requireOfficialSignerRole } from "@/lib/auth/session";
import { requiredOfficialRoleForClearance } from "@/lib/official-roles/roles";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import { recordOfficialClearanceSignature, rejectHealthClearance, verifyHealthClearance } from "@/lib/signatures/service";

function revalidateSignatureViews(enrollmentId: string) {
  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student/enrollment-status");
  revalidatePath("/student/cor");
  revalidatePath("/admin/health-records");
  revalidatePath("/admin/clearances/health");
  revalidatePath(`/admin/clearances/health/${enrollmentId}`);
  revalidatePath("/admin/dashboard");
}

export async function applyOfficialClearanceSignatureAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const clearanceType = String(formData.get("clearance_type") ?? "").trim();
  const officialRole = requiredOfficialRoleForClearance(clearanceType);
  if (!officialRole) return { success: false, message: "The requested clearance is not authorized for an official signer." };
  const { supabase, profile } = await requireOfficialSignerRole(officialRole);
  const result = await recordOfficialClearanceSignature(supabase, profile.id, formData);

  if (result.success) revalidateSignatureViews(String(formData.get("enrollment_id") ?? "").trim());
  return result;
}

export async function verifyHealthClearanceAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireOfficialSignerRole("NURSE");
  const result = await verifyHealthClearance(supabase, profile.id, formData);

  if (result.success) revalidateSignatureViews(String(formData.get("enrollment_id") ?? "").trim());
  return result;
}

export async function rejectHealthRequirementAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase } = await requireOfficialSignerRole("NURSE");
  const result = await rejectHealthClearance(supabase, formData);

  if (result.success) revalidateSignatureViews(String(formData.get("enrollment_id") ?? "").trim());
  return result;
}
