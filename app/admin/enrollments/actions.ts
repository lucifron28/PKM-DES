"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";

type RoleContext = Awaited<ReturnType<typeof requireRole>>;

async function getEnrollmentStudentId(supabase: NonNullable<RoleContext["supabase"]>, enrollmentId: string) {
  const { data } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  return data?.student_id as string | undefined;
}

export async function approveEnrollmentAction(formData: FormData) {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const { supabase, profile } = await requireRole("admin");

  if (!enrollmentId) {
    return;
  }

  const studentId = await getEnrollmentStudentId(supabase, enrollmentId);

  if (!studentId) {
    return;
  }

  await supabase
    .from("enrollments")
    .update({
      status: "APPROVED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
      remarks: null
    })
    .eq("id", enrollmentId);

  await supabase.from("students").update({ enrollment_status: "ENROLLED" }).eq("id", studentId);

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "APPROVE_ENROLLMENT",
    target_table: "enrollments",
    target_id: enrollmentId
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
}

export async function rejectEnrollmentAction(formData: FormData) {
  const enrollmentId = String(formData.get("enrollment_id") ?? "");
  const remarks = String(formData.get("remarks") ?? "").trim() || null;
  const { supabase, profile } = await requireRole("admin");

  if (!enrollmentId) {
    return;
  }

  const studentId = await getEnrollmentStudentId(supabase, enrollmentId);

  if (!studentId) {
    return;
  }

  await supabase
    .from("enrollments")
    .update({
      status: "REJECTED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
      remarks
    })
    .eq("id", enrollmentId);

  await supabase.from("students").update({ enrollment_status: "NOT ENROLLED" }).eq("id", studentId);

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "REJECT_ENROLLMENT",
    target_table: "enrollments",
    target_id: enrollmentId
  });

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
}
