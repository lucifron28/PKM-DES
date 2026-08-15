"use server";

import { handleChangePasswordAction, type ChangePasswordState } from "@/lib/auth/password";
import { requireRole } from "@/lib/auth/session";
import { retireSignatureSpecimenForProfile, saveSignatureSpecimenForProfile } from "@/lib/signatures/specimens";
import type { SignatureActionState } from "@/lib/signatures/action-state";

export async function changeAdminPasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  return handleChangePasswordAction("admin", "/admin/account", formData);
}

export async function saveAdminSignatureSpecimenAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireRole("admin");
  return saveSignatureSpecimenForProfile(supabase, profile.id, formData);
}

export async function deleteAdminSignatureSpecimenAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireRole("admin");
  return retireSignatureSpecimenForProfile(supabase, profile.id, formData);
}
