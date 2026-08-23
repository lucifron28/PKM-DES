"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { HealthRecordUpdateState } from "@/lib/health-records/types";

type HealthRecordRpcResult = {
  outcome?: string;
};

function optionalDate(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
function optionalText(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  return normalized || null;
}

function messageForOutcome(outcome: string | undefined): HealthRecordUpdateState {
  switch (outcome) {
    case "saved":
      return { success: true, message: "Health Record Update saved and sent to PKM Health Services." };
    case "already_verified":
      return { message: "This Health Record Update has already been verified and can no longer be changed." };
    case "not_editable":
      return { message: "This enrollment is no longer available for Health Record Update changes." };
    case "not_applicable":
      return { message: "The Health Record Update form is not required for this student." };
    case "requirement_unavailable":
      return { message: "The Health Record Update requirement could not be loaded. Please refresh and try again." };
    case "invalid_request":
      return { message: "Check the form values and try again." };
    default:
      return { message: "The Health Record Update could not be saved. Please try again." };
  }
}

export async function saveHealthRecordUpdateAction(
  _previousState: HealthRecordUpdateState,
  formData: FormData
): Promise<HealthRecordUpdateState> {
  const { supabase } = await requireRole("student");
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();

  if (!enrollmentId) return { message: "Enrollment record is required." };

  const { data, error } = await supabase.rpc("save_health_record_update", {
    p_enrollment_id: enrollmentId,
    p_medical_condition_1: optionalText(formData.get("medical_condition_1")),
    p_medical_condition_1_identified_on: optionalDate(formData.get("medical_condition_1_identified_on")),
    p_medical_condition_1_medication: optionalText(formData.get("medical_condition_1_medication")),
    p_medical_condition_2: optionalText(formData.get("medical_condition_2")),
    p_medical_condition_2_identified_on: optionalDate(formData.get("medical_condition_2_identified_on")),
    p_medical_condition_2_medication: optionalText(formData.get("medical_condition_2_medication")),
    p_allergy: optionalText(formData.get("allergy")),
    p_last_menstrual_period: optionalDate(formData.get("last_menstrual_period")),
    p_others: optionalText(formData.get("others"))
  });

  if (error) {
    console.error("student_health_record:update", { message: error.message });
    return { message: "The Health Record Update could not be saved. Please try again." };
  }

  const result = (data as HealthRecordRpcResult[] | null)?.[0];
  const state = messageForOutcome(result?.outcome);
  if (state.success) {
    revalidatePath(`/student/enrollments/${enrollmentId}/health-record`);
    revalidatePath("/student/enrollment-status");
    revalidatePath(`/admin/clearances/health/${enrollmentId}`);
    revalidatePath("/admin/clearances/health");
  }
  return state;
}
