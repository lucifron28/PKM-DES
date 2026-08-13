import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getClearanceDefinition } from "@/lib/signatures/clearances";
import { computeEnrollmentDocumentHash, computeHealthRecordDocumentHash, type EnrollmentFingerprintInput } from "@/lib/signatures/fingerprint";
import {
  buildSignatureStoragePath,
  SIGNATURE_BUCKET,
  validatePngSignatureDataUrl,
  validateSignatureConfirmation
} from "@/lib/signatures/validation";
import type { OfficialSignerRole, SignatureClearanceType } from "@/types/database";

type ServiceResult = {
  success: boolean;
  message: string;
};

type EnrollmentRecord = EnrollmentFingerprintInput & {
  student_id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  students?: { id: string; profile_id: string } | null;
};

type NurseRequirementRow = {
  enrollment_id: string;
  enrollment_status: "PENDING" | "APPROVED" | "REJECTED";
  student_id: string;
  academic_year: string;
  semester: string;
  requirement_id: string;
  requirement_status: "PENDING" | "VERIFIED" | "REJECTED";
  requirement_applicability: "APPLICABLE" | "NOT_APPLICABLE";
  nurse_signature_is_current: boolean;
};

type SignatureRpcResult = {
  outcome?: string;
};

type SignatureFormPayloadResult =
  | { ok: false; error: string }
  | { ok: true; payload: ReturnType<typeof validatePngSignatureDataUrl> extends infer Payload
      ? Exclude<Payload, null>
      : never };

function signatureFormPayload(formData: FormData): SignatureFormPayloadResult {
  if (!validateSignatureConfirmation(formData.get("signature_confirmation"))) {
    return { ok: false, error: "Please confirm that you are applying your own drawn electronic signature." };
  }

  const payload = validatePngSignatureDataUrl(formData.get("signature_data"));
  if (!payload) {
    return { ok: false, error: "The signature image is empty, malformed, or exceeds the allowed PNG size." };
  }

  return { ok: true, payload };
}

async function uploadSignature(path: string, bytes: Buffer) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(SIGNATURE_BUCKET).upload(path, bytes, {
    cacheControl: "3600",
    contentType: "image/png",
    upsert: false
  });

  if (error) return { admin, error };
  return { admin, error: null };
}

async function safeUploadSignature(path: string, bytes: Buffer) {
  try {
    return await uploadSignature(path, bytes);
  } catch {
    return null;
  }
}

async function cleanupSignature(admin: ReturnType<typeof createSupabaseAdminClient>, path: string) {
  const { error } = await admin.storage.from(SIGNATURE_BUCKET).remove([path]);
  if (error) console.error("signature_storage:cleanup_failed", { message: error.message });
}

async function loadEnrollment(supabase: SupabaseClient, enrollmentId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, student_id, program_id, year_level, academic_year, semester, status, enrollment_subjects(id, course_code, course_description, units), students(id, profile_id)")
    .eq("id", enrollmentId)
    .maybeSingle();

  return { enrollment: (data as EnrollmentRecord | null) ?? null, error };
}

function resultMessage(outcome: string | undefined, signerLabel: string) {
  switch (outcome) {
    case "signed":
      return { success: true, message: `${signerLabel} e-signature applied successfully.` } satisfies ServiceResult;
    case "duplicate":
      return { success: false, message: "This clearance already has an accepted signature and cannot be overwritten." } satisfies ServiceResult;
    case "fingerprint_mismatch":
      return { success: false, message: "The signed enrollment changed while this form was open. Refresh and draw a new signature." } satisfies ServiceResult;
    case "not_signable":
      return { success: false, message: "This enrollment is no longer in a signable state." } satisfies ServiceResult;
    case "not_applicable":
      return { success: false, message: "This clearance is not applicable to the enrollment." } satisfies ServiceResult;
    case "already_verified":
      return { success: false, message: "Health Clearance is already verified and cannot be overwritten." } satisfies ServiceResult;
    case "requirement_unavailable":
      return { success: false, message: "The Health Record Update requirement could not be loaded safely." } satisfies ServiceResult;
    case "unauthorized":
      return { success: false, message: "Your account is not authorized for this signing role." } satisfies ServiceResult;
    default:
      return { success: false, message: "The electronic signature could not be saved. Please refresh and try again." } satisfies ServiceResult;
  }
}

export async function recordStudentEnrollmentSignature(
  supabase: SupabaseClient,
  profileId: string,
  formData: FormData
): Promise<ServiceResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const parsed = signatureFormPayload(formData);
  if (!enrollmentId) return { success: false, message: "Enrollment record is required." };
  if (!parsed.ok) return { success: false, message: parsed.error };
  const { payload } = parsed;

  const { enrollment, error } = await loadEnrollment(supabase, enrollmentId);
  if (error || !enrollment || enrollment.students?.profile_id !== profileId || enrollment.student_id !== enrollment.students.id) {
    return { success: false, message: "The selected enrollment is not available for your account." };
  }
  if (enrollment.status !== "PENDING" && enrollment.status !== "APPROVED") {
    return { success: false, message: "This enrollment is no longer in a signable state." };
  }

  const signatureId = randomUUID();
  const path = buildSignatureStoragePath(enrollmentId, "STUDENT", signatureId);
  const upload = await safeUploadSignature(path, payload.bytes);
  if (!upload) {
    return { success: false, message: "Secure signature storage is not configured." };
  }
  if (upload.error) {
    console.error("signature_storage:student_upload_failed", { message: upload.error.message });
    return { success: false, message: "The signature image could not be stored securely." };
  }
  const admin = upload.admin;

  const documentHash = computeEnrollmentDocumentHash(
    enrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const { data, error: rpcError } = await supabase.rpc("record_student_enrollment_signature", {
    p_enrollment_id: enrollmentId,
    p_signature_id: signatureId,
    p_signature_storage_path: path,
    p_signature_hash: payload.signatureHash,
    p_document_hash: documentHash
  });

  if (rpcError) {
    await cleanupSignature(admin, path);
    console.error("signature_record:student_rpc_failed", { message: rpcError.message });
    return { success: false, message: "The student signature could not be recorded." };
  }

  const result = (data as SignatureRpcResult[] | null)?.[0];
  const outcome = result?.outcome;
  if (outcome !== "signed") await cleanupSignature(admin, path);
  return resultMessage(outcome, "Student");
}

export async function recordOfficialClearanceSignature(
  supabase: SupabaseClient,
  officialRole: OfficialSignerRole,
  formData: FormData
): Promise<ServiceResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const clearanceType = String(formData.get("clearance_type") ?? "").trim() as SignatureClearanceType;
  const definition = getClearanceDefinition(clearanceType);
  const parsed = signatureFormPayload(formData);

  if (!enrollmentId || !definition || definition.signerRole !== officialRole || clearanceType === "HEALTH_CLEARANCE") {
    return { success: false, message: "The requested clearance is not authorized for this account." };
  }
  if (!parsed.ok) return { success: false, message: parsed.error };
  const { payload } = parsed;

  const { enrollment, error } = await loadEnrollment(supabase, enrollmentId);
  if (error || !enrollment) return { success: false, message: "The selected enrollment could not be loaded." };
  if (enrollment.status !== "PENDING" && enrollment.status !== "APPROVED") {
    return { success: false, message: "This enrollment is no longer in a signable state." };
  }

  const signatureId = randomUUID();
  const path = buildSignatureStoragePath(enrollmentId, officialRole, signatureId);
  const upload = await safeUploadSignature(path, payload.bytes);
  if (!upload) {
    return { success: false, message: "Secure signature storage is not configured." };
  }
  if (upload.error) {
    console.error("signature_storage:official_upload_failed", { message: upload.error.message });
    return { success: false, message: "The signature image could not be stored securely." };
  }
  const admin = upload.admin;

  const documentHash = computeEnrollmentDocumentHash(
    enrollment,
    officialRole,
    clearanceType,
    "ENROLLMENT_CLEARANCE"
  );
  const { data, error: rpcError } = await supabase.rpc("record_official_clearance_signature", {
    p_enrollment_id: enrollmentId,
    p_clearance_type: clearanceType,
    p_signature_id: signatureId,
    p_signature_storage_path: path,
    p_signature_hash: payload.signatureHash,
    p_document_hash: documentHash
  });

  if (rpcError) {
    await cleanupSignature(admin, path);
    console.error("signature_record:official_rpc_failed", { message: rpcError.message });
    return { success: false, message: "The official clearance signature could not be recorded." };
  }

  const outcome = ((data as SignatureRpcResult[] | null)?.[0])?.outcome;
  if (outcome !== "signed") await cleanupSignature(admin, path);
  return resultMessage(outcome, definition.signerLabel);
}

export async function verifyHealthClearance(
  supabase: SupabaseClient,
  formData: FormData
): Promise<ServiceResult> {
  const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
  const parsed = signatureFormPayload(formData);
  if (!enrollmentId) return { success: false, message: "Enrollment record is required." };
  if (!parsed.ok) return { success: false, message: parsed.error };
  const { payload } = parsed;

  const { data, error } = await supabase.rpc("get_nurse_health_requirement", { p_enrollment_id: enrollmentId });
  if (error) {
    console.error("signature_record:nurse_requirement_load_failed", { message: error.message });
    return { success: false, message: "The Health Record Update requirement could not be loaded safely." };
  }
  const requirement = (data as NurseRequirementRow[] | null)?.[0] ?? null;
  if (!requirement || requirement.requirement_applicability !== "APPLICABLE") {
    return resultMessage("not_applicable", "Nurse");
  }
  if (requirement.enrollment_status !== "PENDING") {
    return resultMessage("not_signable", "Nurse");
  }
  if (requirement.requirement_status === "REJECTED") {
    return resultMessage("not_signable", "Nurse");
  }
  if (requirement.requirement_status === "VERIFIED" && requirement.nurse_signature_is_current) {
    return resultMessage("already_verified", "Nurse");
  }

  const signatureId = randomUUID();
  const path = buildSignatureStoragePath(enrollmentId, "NURSE", signatureId);
  const upload = await safeUploadSignature(path, payload.bytes);
  if (!upload) {
    return { success: false, message: "Secure signature storage is not configured." };
  }
  if (upload.error) {
    console.error("signature_storage:nurse_upload_failed", { message: upload.error.message });
    return { success: false, message: "The signature image could not be stored securely." };
  }
  const admin = upload.admin;

  const documentHash = computeHealthRecordDocumentHash({
    enrollmentId,
    studentId: requirement.student_id,
    academicYear: requirement.academic_year,
    semester: requirement.semester,
    applicability: "APPLICABLE",
    status: "VERIFIED"
  });
  const { data: rpcData, error: rpcError } = await supabase.rpc("verify_health_requirement_with_signature", {
    p_enrollment_id: enrollmentId,
    p_signature_id: signatureId,
    p_signature_storage_path: path,
    p_signature_hash: payload.signatureHash,
    p_document_hash: documentHash
  });

  if (rpcError) {
    await cleanupSignature(admin, path);
    console.error("signature_record:nurse_rpc_failed", { message: rpcError.message });
    return { success: false, message: "The Nurse verification was not saved." };
  }

  const outcome = ((rpcData as SignatureRpcResult[] | null)?.[0])?.outcome;
  if (outcome !== "signed") await cleanupSignature(admin, path);
  return resultMessage(outcome, "Nurse");
}
