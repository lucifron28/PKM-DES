"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { isRequirementUuid } from "@/lib/requirements/rules";
import { MAX_MEDICAL_DOCUMENT_BYTES, MEDICAL_DOCUMENT_BUCKET, validateMedicalDocument } from "@/lib/requirements/medical-documents";

export type MedicalUploadState = { success?: boolean; message?: string };
export async function uploadMedicalDocumentAction(_state: MedicalUploadState, formData: FormData): Promise<MedicalUploadState> {
  const { supabase, profile } = await requireRole("student");
  const enrollmentId = formData.get("enrollment_id");
  const file = formData.get("document");
  if (typeof enrollmentId !== "string" || !isRequirementUuid(enrollmentId)) return { message: "A valid enrollment is required." };
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_MEDICAL_DOCUMENT_BYTES) return { message: "Choose a PDF or image no larger than 1 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const invalid = validateMedicalDocument(bytes, file.type);
  if (invalid) return { message: invalid };
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : "png";
  const path = `${enrollmentId}/${profile.id}/${randomUUID()}.${extension}`;
  const upload = await supabase.storage.from(MEDICAL_DOCUMENT_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (upload.error) return { message: "The medical paper could not be uploaded. Only your pending enrollments accept uploads." };
  const result = await supabase.rpc("record_student_medical_document_upload", {
    p_enrollment_id: enrollmentId, p_storage_path: path,
    p_original_file_name: file.name.replace(/[\x00-\x1f\/\\]/g, "_").slice(0, 180) || "Medical paper",
    p_content_type: file.type, p_file_size: bytes.length,
    p_content_hash: createHash("sha256").update(bytes).digest("hex")
  });
  if (result.error || !Array.isArray(result.data) || result.data[0]?.outcome !== "saved") {
    return { message: "The upload could not be submitted for Nurse review. Please refresh and try again." };
  }
  revalidatePath(`/student/enrollments/${enrollmentId}/medical-documents`);
  revalidatePath("/student/enrollment-status");
  revalidatePath(`/admin/clearances/health/${enrollmentId}`);
  revalidatePath("/admin/clearances/health");
  revalidatePath("/admin/enrollments");
  return { success: true, message: "Medical paper submitted. The Nurse must review your updated papers before signing health clearance." };
}
