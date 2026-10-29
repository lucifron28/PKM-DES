"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRegistrarAdmin } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readIds(formData: FormData, field: string) {
  const ids = formData.getAll(field).map((value) => String(value).trim());
  return ids.length > 0 && ids.length <= 100 && ids.every((id) => UUID.test(id)) && new Set(ids).size === ids.length
    ? ids
    : null;
}

export async function createIrregularEnrollmentAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const courseOfferingIds = readIds(formData, "course_offering_ids");
  if (!UUID.test(studentId) || !courseOfferingIds) {
    redirect("/admin/enrollments/load?error=invalid_request");
  }

  const { data, error } = await supabase.rpc("registrar_create_irregular_enrollment", {
    p_student_id: studentId,
    p_course_offering_ids: courseOfferingIds
  });
  if (error) {
    console.error("registrar_load:create_rpc");
    redirect("/admin/enrollments/load?error=load_failed");
  }

  const result = Array.isArray(data) ? data[0] : null;
  if (result?.outcome !== "created" || !UUID.test(String(result.enrollment_id ?? ""))) {
    const errorCode = result?.outcome === "duplicate" ? "duplicate" : result?.outcome === "term_unavailable" ? "term_unavailable" : result?.outcome === "unauthorized" ? "unauthorized" : result?.outcome === "standard_load_available" ? "standard_load_available" : "load_failed";
    redirect(`/admin/enrollments/load?error=${errorCode}`);
  }

  const enrollmentId = String(result.enrollment_id);
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
  revalidatePath("/admin/reports");
  revalidatePath("/student/enrollment-status");
  redirect(`/admin/enrollments/${enrollmentId}/registration?load=created`);
}

export async function updatePendingEnrollmentScheduleAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  if (!UUID.test(enrollmentId)) {
    redirect("/admin/enrollments?error=invalid_request");
  }

  let subjects: unknown;
  try {
    subjects = JSON.parse(String(formData.get("subjects_json") ?? ""));
  } catch {
    redirect(`/admin/enrollments/${enrollmentId}/registration?load_error=invalid_request`);
  }
  if (!Array.isArray(subjects)) {
    redirect("/admin/enrollments?error=invalid_request");
  }

  const { data, error } = await supabase.rpc("registrar_update_pending_enrollment_schedule", {
    p_enrollment_id: enrollmentId,
    p_subjects: subjects
  });
  if (error) {
    console.error("registrar_load:schedule_rpc");
    redirect(`/admin/enrollments/${enrollmentId}/registration?load_error=save_failed`);
  }
  const result = Array.isArray(data) ? data[0] : null;
  if (result?.enrollment_id !== enrollmentId || !["updated", "unchanged"].includes(String(result.outcome))) {
    const outcome = String(result?.outcome ?? "");
    const errorCode = outcome === "unauthorized"
      ? "unauthorized"
      : outcome === "enrollment_not_pending"
        ? "approved_immutable"
        : outcome === "invalid_schedule_text"
          ? "invalid_schedule_text"
          : "save_failed";
    redirect(`/admin/enrollments/${enrollmentId}/registration?load_error=${errorCode}`);
  }

  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student/enrollment-status");
  revalidatePath("/admin/clearances");
  redirect(`/admin/enrollments/${enrollmentId}/registration?load=${result.outcome}`);
}

export async function setIrregularEnrollmentOfferingsAction(formData: FormData) {
  const { supabase } = await requireRegistrarAdmin();
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const rawOfferingIds = formData.getAll("course_offering_ids");
  const courseOfferingIds = rawOfferingIds.length === 0 ? [] : readIds(formData, "course_offering_ids");
  const legacySubjectIds = formData.getAll("legacy_subject_ids").length === 0 ? [] : readIds(formData, "legacy_subject_ids");
  const explicitLegacySelection = formData.get("legacy_selection_explicit") === "true";
  if (!UUID.test(enrollmentId)) {
    redirect("/admin/enrollments?error=invalid_request");
  }
  if (courseOfferingIds === null || legacySubjectIds === null) {
    redirect("/admin/enrollments/" + enrollmentId + "/registration?load_error=invalid_request");
  }

  const { data, error } = await supabase.rpc("registrar_set_irregular_enrollment_offerings", {
    p_enrollment_id: enrollmentId,
    p_course_offering_ids: courseOfferingIds,
    p_legacy_subject_ids: explicitLegacySelection ? legacySubjectIds : null
  });
  if (error) {
    console.error("registrar_load:offerings_rpc");
    redirect(`/admin/enrollments/${enrollmentId}/registration?load_error=save_failed`);
  }
  const result = Array.isArray(data) ? data[0] : null;
  if (result?.enrollment_id !== enrollmentId || !["updated", "unchanged"].includes(String(result.outcome))) {
    const outcome = String(result?.outcome ?? "");
    const errorCode = outcome === "unauthorized" ? "unauthorized" : outcome === "enrollment_not_pending" ? "approved_immutable" : "save_failed";
    redirect(`/admin/enrollments/${enrollmentId}/registration?load_error=${errorCode}`);
  }

  revalidatePath("/admin/enrollments");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/admin/masterlist");
  revalidatePath("/admin/reports");
  revalidatePath("/admin/clearances");
  revalidatePath("/student/enrollment-status");
  redirect(`/admin/enrollments/${enrollmentId}/registration?load=${result.outcome}`);
}
