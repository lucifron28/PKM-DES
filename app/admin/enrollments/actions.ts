"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { Enrollment, EnrollmentStatus } from "@/types/database";

type RoleContext = Awaited<ReturnType<typeof requireRole>>;
type SupabaseClient = NonNullable<RoleContext["supabase"]>;

async function getEnrollmentStudentId(supabase: SupabaseClient, enrollmentId: string) {
  const { data } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("id", enrollmentId)
    .maybeSingle();

  return data?.student_id as string | undefined;
}

async function refreshStudentEnrollmentStatus(supabase: SupabaseClient, studentId: string) {
  const { data, error: statusReadError } = await supabase
    .from("enrollments")
    .select("status")
    .eq("student_id", studentId)
    .returns<Pick<Enrollment, "status">[]>();

  if (statusReadError) {
    return false;
  }

  const statuses = data?.map((enrollment) => enrollment.status) ?? [];
  const nextStatus: EnrollmentStatus = statuses.includes("APPROVED")
    ? "ENROLLED"
    : statuses.includes("PENDING")
      ? "PENDING"
      : "NOT ENROLLED";

  const { error: statusUpdateError } = await supabase
    .from("students")
    .update({ enrollment_status: nextStatus })
    .eq("id", studentId);

  return !statusUpdateError;
}

function revalidateEnrollmentViews(enrollmentId: string) {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/enrollments");
  revalidatePath("/admin/masterlist");
  revalidatePath(`/admin/enrollments/${enrollmentId}/registration`);
  revalidatePath("/student", "layout");
  revalidatePath("/student/dashboard");
  revalidatePath("/student/enrollment-status");
  revalidatePath("/student/cor");
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

  const { data: reviewedEnrollment, error: reviewError } = await supabase
    .from("enrollments")
    .update({
      status: "APPROVED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
      remarks: null
    })
    .eq("id", enrollmentId)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (reviewError || !reviewedEnrollment) {
    return;
  }

  await refreshStudentEnrollmentStatus(supabase, studentId);

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "APPROVE_ENROLLMENT",
    target_table: "enrollments",
    target_id: enrollmentId
  });

  revalidateEnrollmentViews(enrollmentId);
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

  const { data: reviewedEnrollment, error: reviewError } = await supabase
    .from("enrollments")
    .update({
      status: "REJECTED",
      reviewed_at: new Date().toISOString(),
      reviewed_by: profile.id,
      remarks
    })
    .eq("id", enrollmentId)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();

  if (reviewError || !reviewedEnrollment) {
    return;
  }

  await refreshStudentEnrollmentStatus(supabase, studentId);

  await supabase.from("audit_logs").insert({
    actor_profile_id: profile.id,
    action: "REJECT_ENROLLMENT",
    target_table: "enrollments",
    target_id: enrollmentId
  });

  revalidateEnrollmentViews(enrollmentId);
}
