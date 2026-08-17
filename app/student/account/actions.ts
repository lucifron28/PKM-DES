"use server";

import { handleChangePasswordAction, type ChangePasswordState } from "@/lib/auth/password";
import { requireRole } from "@/lib/auth/session";
import { retireSignatureSpecimenForProfile, saveSignatureSpecimenForProfile } from "@/lib/signatures/specimens";
import type { SignatureActionState } from "@/lib/signatures/action-state";

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  return handleChangePasswordAction("student", "/student/account", formData);
}

export async function saveStudentSignatureSpecimenAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireRole("student");
  return saveSignatureSpecimenForProfile(supabase, profile.id, formData);
}

export async function deleteStudentSignatureSpecimenAction(
  _previousState: SignatureActionState,
  formData: FormData
): Promise<SignatureActionState> {
  const { supabase, profile } = await requireRole("student");
  return retireSignatureSpecimenForProfile(supabase, profile.id, formData);
}
