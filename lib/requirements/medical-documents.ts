import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDICAL_DOCUMENT_BUCKET = "enrollment-medical-documents";
export const MAX_MEDICAL_DOCUMENT_BYTES = 1_048_576;
export type MedicalDocument = {
  id: string; revision: number; storage_path: string; original_file_name: string;
  content_type: string; file_size: number; uploaded_at: string;
};

export function validateMedicalDocument(bytes: Uint8Array, contentType: string) {
  if (!bytes.length || bytes.length > MAX_MEDICAL_DOCUMENT_BYTES) return "Choose a file no larger than 1 MB.";
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const pdf = [37, 80, 68, 70, 45].every((value, index) => bytes[index] === value);
  if ((contentType === "image/png" && png) || (contentType === "image/jpeg" && jpeg) || (contentType === "application/pdf" && pdf)) return null;
  return "Choose a PDF, JPEG, or PNG file with matching file contents.";
}

export async function loadMedicalDocuments(supabase: SupabaseClient, enrollmentId: string) {
  const { data, error } = await supabase.from("enrollment_medical_documents")
    .select("id, revision, storage_path, original_file_name, content_type, file_size, uploaded_at")
    .eq("enrollment_id", enrollmentId).order("revision", { ascending: false });
  if (error) return { documents: [], error };
  const documents = await Promise.all(((data ?? []) as MedicalDocument[]).map(async (document) => {
    const link = await supabase.storage.from(MEDICAL_DOCUMENT_BUCKET).createSignedUrl(document.storage_path, 300);
    return { ...document, signed_url: link.data?.signedUrl ?? null };
  }));
  return { documents, error: null };
}
