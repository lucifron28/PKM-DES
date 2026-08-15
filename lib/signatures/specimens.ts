import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import {
  buildSignatureSpecimenStoragePath,
  SIGNATURE_SPECIMEN_BUCKET,
  validatePngSignatureBytes,
  validatePngSignatureDataUrl,
  validateSignatureConfirmation,
  type ValidatedSignaturePayload
} from "@/lib/signatures/validation";
import type { SignatureActionState } from "@/lib/signatures/action-state";

export type SignatureSpecimenView = {
  id: string;
  signatureHash: string;
  createdAt: string;
  signedUrl: string | null;
};

type SignatureSpecimenRow = {
  id: string;
  profile_id: string;
  signature_storage_path: string;
  signature_hash: string;
  created_at: string;
  retired_at: string | null;
};

function specimenMessage(outcome: string | undefined): SignatureActionState {
  switch (outcome) {
    case "saved":
      return { success: true, message: "Saved signature specimen updated. It is available only to your account." };
    case "retired":
      return { success: true, message: "Saved signature specimen removed. Existing signed records were not changed." };
    case "not_found":
      return { success: false, message: "That saved signature is no longer available." };
    case "invalid_request":
      return { success: false, message: "The saved signature request was invalid." };
    case "unauthorized":
      return { success: false, message: "You are not authorized to manage this saved signature." };
    default:
      return { success: false, message: "The saved signature could not be updated. Please refresh and try again." };
  }
}

async function cleanupSpecimen(admin: ReturnType<typeof createSupabaseAdminClient>, path: string) {
  const { error } = await admin.storage.from(SIGNATURE_SPECIMEN_BUCKET).remove([path]);
  if (error) console.error("signature_specimen:cleanup_failed", { message: error.message });
}

export async function loadCurrentSignatureSpecimen(
  supabase: SupabaseClient,
  profileId: string
): Promise<SignatureSpecimenView | null> {
  const { data, error } = await supabase
    .from("signature_specimens")
    .select("id, profile_id, signature_storage_path, signature_hash, created_at, retired_at")
    .eq("profile_id", profileId)
    .is("retired_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const specimen = data as SignatureSpecimenRow;
  let signedUrl: string | null = null;
  try {
    const admin = createSupabaseAdminClient();
    const signed = await admin.storage.from(SIGNATURE_SPECIMEN_BUCKET).createSignedUrl(specimen.signature_storage_path, 3600);
    signedUrl = signed.error ? null : signed.data.signedUrl;
  } catch {
    signedUrl = null;
  }

  return {
    id: specimen.id,
    signatureHash: specimen.signature_hash,
    createdAt: specimen.created_at,
    signedUrl
  };
}

export async function loadSavedSignaturePayload(
  supabase: SupabaseClient,
  profileId: string,
  specimenId: string
): Promise<ValidatedSignaturePayload | null> {
  if (!specimenId) return null;

  const { data, error } = await supabase
    .from("signature_specimens")
    .select("id, profile_id, signature_storage_path, signature_hash, created_at, retired_at")
    .eq("id", specimenId)
    .eq("profile_id", profileId)
    .is("retired_at", null)
    .maybeSingle();
  if (error || !data) return null;

  try {
    const admin = createSupabaseAdminClient();
    const specimen = data as SignatureSpecimenRow;
    const downloaded = await admin.storage.from(SIGNATURE_SPECIMEN_BUCKET).download(specimen.signature_storage_path);
    if (downloaded.error || !downloaded.data) return null;
    const payload = await validatePngSignatureBytes(Buffer.from(await downloaded.data.arrayBuffer()));
    return payload?.signatureHash === specimen.signature_hash ? payload : null;
  } catch {
    return null;
  }
}

export async function saveSignatureSpecimenForProfile(
  supabase: SupabaseClient,
  profileId: string,
  formData: FormData
): Promise<SignatureActionState> {
  if (!validateSignatureConfirmation(formData.get("specimen_confirmation"))) {
    return { success: false, message: "Confirm that this is your own saved signature before storing it." };
  }

  const payload = await validatePngSignatureDataUrl(formData.get("signature_data"));
  if (!payload) {
    return { success: false, message: "Draw a real signature before saving it. A blank mark or tiny dot is not accepted." };
  }

  const specimenId = randomUUID();
  const path = buildSignatureSpecimenStoragePath(profileId, specimenId);
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return { success: false, message: "Secure signature storage is not configured." };
  }

  const { error: uploadError } = await admin.storage.from(SIGNATURE_SPECIMEN_BUCKET).upload(path, payload.bytes, {
    cacheControl: "3600",
    contentType: "image/png",
    upsert: false
  });
  if (uploadError) {
    console.error("signature_specimen:upload_failed", { message: uploadError.message });
    return { success: false, message: "The saved signature could not be stored securely." };
  }

  const { data, error } = await supabase.rpc("save_signature_specimen", {
    p_signature_id: specimenId,
    p_signature_storage_path: path,
    p_signature_hash: payload.signatureHash
  });
  if (error) {
    await cleanupSpecimen(admin, path);
    console.error("signature_specimen:save_rpc_failed", { message: error.message });
    return { success: false, message: "The saved signature could not be registered." };
  }

  const result = (data as Array<{ outcome?: string }> | null)?.[0];
  if (result?.outcome !== "saved") await cleanupSpecimen(admin, path);
  return specimenMessage(result?.outcome);
}

export async function retireSignatureSpecimenForProfile(
  supabase: SupabaseClient,
  _profileId: string,
  formData: FormData
): Promise<SignatureActionState> {
  const specimenId = String(formData.get("signature_specimen_id") ?? "").trim();
  if (!specimenId) return { success: false, message: "Saved signature record is required." };

  const { data, error } = await supabase.rpc("retire_signature_specimen", { p_signature_id: specimenId });
  if (error) {
    console.error("signature_specimen:retire_rpc_failed", { message: error.message });
    return { success: false, message: "The saved signature could not be removed." };
  }

  const result = (data as Array<{ outcome?: string; signature_storage_path?: string }> | null)?.[0];
  if (result?.outcome === "retired" && result.signature_storage_path) {
    try {
      await cleanupSpecimen(createSupabaseAdminClient(), result.signature_storage_path);
    } catch {
      // The row is already retired, so a storage cleanup retry cannot affect signature history.
      console.error("signature_specimen:retired_storage_cleanup_unavailable");
    }
  }
  return specimenMessage(result?.outcome);
}
