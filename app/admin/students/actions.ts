"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import {
  addOfficialRecordService,
  type OfficialRecordFormState
} from "@/lib/admin-student-records/official-record-service";
import { updateOfficialRecordAndSyncService } from "@/lib/admin-student-records/synchronization-service";
import { resetStudentPasswordService } from "@/lib/admin-student-records/password-reset-service";
import type { StudentPasswordResetState } from "@/lib/admin-student-records/password-reset";

export type { OfficialRecordFormState, StudentPasswordResetState };

export async function addOfficialStudentRecordAction(
  _previousState: OfficialRecordFormState,
  formData: FormData
): Promise<OfficialRecordFormState> {
  const { supabase, profile } = await requireRole("admin");
  const result = await addOfficialRecordService(supabase, profile.id, formData);

  if (result.success) {
    redirect("/admin/students?created=1");
  }

  return result;
}

export async function updateOfficialStudentRecordAction(
  _previousState: OfficialRecordFormState,
  formData: FormData
): Promise<OfficialRecordFormState> {
  const { supabase } = await requireRole("admin");
  const result = await updateOfficialRecordAndSyncService(supabase, formData);

  if (result.success && result.recordId) {
    const mismatchQuery = result.emailMismatch ? "&email_mismatch=1" : "";
    redirect(`/admin/students/${result.recordId}/edit?updated=1${mismatchQuery}`);
  }

  return result;
}

export async function resetStudentPasswordAction(
  _previousState: StudentPasswordResetState,
  formData: FormData
): Promise<StudentPasswordResetState> {
  const { supabase, profile } = await requireRole("admin");
  return resetStudentPasswordService(supabase, formData, profile.id);
}
