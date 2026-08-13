"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import {
  canManageOfficialAssignment,
  canReceiveActiveOfficialAssignment,
  type AssignmentTargetProfile
} from "@/lib/official-roles/management";
import { isOfficialSignerRole } from "@/lib/official-roles/roles";
import type { Profile } from "@/types/database";

type AssignmentRpcResult = {
  outcome?: string;
};

function redirectWithResult(kind: "success" | "error", value: string): never {
  redirect(`/admin/official-signers?${kind}=${encodeURIComponent(value)}`);
}

export async function setOfficialRoleAssignmentAction(formData: FormData) {
  const { supabase, profile } = await requireRegistrarAdmin();
  const targetProfileId = String(formData.get("profile_id") ?? "").trim();
  const officialRole = String(formData.get("official_role") ?? "").trim();
  const activeValue = String(formData.get("active") ?? "").trim();
  const programId = String(formData.get("program_id") ?? "").trim() || null;
  const active = activeValue === "true";

  if (!targetProfileId || !isOfficialSignerRole(officialRole) || (activeValue !== "true" && activeValue !== "false")) {
    redirectWithResult("error", "invalid_request");
  }

  const { data: targetData, error: targetError } = await supabase
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", targetProfileId)
    .maybeSingle();
  const targetProfile = targetData as Pick<Profile, "id" | "role" | "account_status"> | null;
  const targetForPolicy = targetProfile as AssignmentTargetProfile | null;

  if (targetError || !targetForPolicy || !canManageOfficialAssignment(profile.id, targetForPolicy)) {
    redirectWithResult("error", targetProfileId === profile.id ? "self_assignment_forbidden" : "target_not_admin");
  }

  if (active && !canReceiveActiveOfficialAssignment(targetForPolicy)) {
    redirectWithResult("error", "target_not_active");
  }

  const { data, error } = await supabase.rpc("set_official_role_assignment", {
    p_profile_id: targetProfileId,
    p_official_role: officialRole,
    p_active: active,
    p_program_id: programId
  });
  const result = (data as AssignmentRpcResult[] | null)?.[0];

  if (error || !result?.outcome) {
    console.error("official_signers:assignment_rpc_failed", { message: error?.message });
    redirectWithResult("error", "assignment_failed");
  }

  if (["assigned", "revoked", "unchanged"].includes(result.outcome)) {
    revalidatePath("/admin/official-signers");
    revalidatePath("/admin/enrollments");
    revalidatePath("/admin/health-records");
    redirectWithResult("success", result.outcome);
  }

  redirectWithResult("error", result.outcome);
}
