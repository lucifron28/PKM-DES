"use server";

import { handleChangePasswordAction, type ChangePasswordState } from "@/lib/auth/password";
import { requireRegistrarAdmin, requireRole } from "@/lib/auth/session";
import { getDemoResetAvailability, isDemoResetConfirmation } from "@/lib/demo/reset-guard";
import { resetStudentDemoData, type DemoResetReport } from "@/lib/demo/reset-service";
import { retireSignatureSpecimenForProfile, saveSignatureSpecimenForProfile } from "@/lib/signatures/specimens";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import { revalidatePath } from "next/cache";

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

export type DemoResetState = {
  message?: string;
  success?: boolean;
  report?: DemoResetReport;
};

export async function resetDemoDataAction(
  _previousState: DemoResetState,
  formData: FormData
): Promise<DemoResetState> {
  await requireRegistrarAdmin();

  const availability = getDemoResetAvailability();
  if (!availability.enabled) {
    return { message: availability.reason };
  }

  if (!isDemoResetConfirmation(formData.get("confirmation"))) {
    return { message: "Type RESET_PKM_DES_DEMO exactly to confirm this demo reset." };
  }

  try {
    const report = await resetStudentDemoData(createSupabaseAdminClient());
    revalidatePath("/admin/account");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/enrollments");
    revalidatePath("/admin/masterlist");
    revalidatePath("/admin/reports");
    revalidatePath("/admin/students");
    revalidatePath("/student", "layout");

    return {
      success: true,
      message: "Demo student accounts and records were reset. Registrar and staff accounts were kept.",
      report
    };
  } catch (error) {
    console.error("demo_reset:failed", error instanceof Error ? error.message : "unknown error");
    return {
      message: "The demo reset could not be completed. No reset result was accepted. Check the server configuration and try again."
    };
  }
}
