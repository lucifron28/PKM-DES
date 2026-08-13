import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getClearanceDefinition } from "@/lib/signatures/clearances";
import { computeEnrollmentDocumentHash, computeHealthRecordDocumentHash, type EnrollmentFingerprintInput } from "@/lib/signatures/fingerprint";
import type { RequirementApplicability, RequirementStatus } from "@/lib/requirements/types";
import type { EnrollmentClearanceStatus, EnrollmentSignature, SignatureClearanceType } from "@/types/database";

export type PresentedEnrollmentSignature = Pick<
  EnrollmentSignature,
  "id" | "enrollment_id" | "student_id" | "signer_profile_id" | "signer_role" | "clearance_type" | "document_type" | "signer_name_snapshot" | "signature_storage_path" | "document_hash" | "signed_at"
> & {
  signed_url: string | null;
  is_current: boolean;
};

export type SignaturePresentationLoad = {
  signatures: PresentedEnrollmentSignature[];
  error: unknown | null;
};

export async function loadEnrollmentSignaturePresentation(
  supabase: SupabaseClient,
  enrollment: EnrollmentFingerprintInput,
  healthRequirement?: { applicability: RequirementApplicability; status: RequirementStatus } | null
): Promise<SignaturePresentationLoad> {
  const [signatureResponse, clearanceResponse] = await Promise.all([
    supabase
      .from("enrollment_signatures")
      .select("id, enrollment_id, student_id, signer_profile_id, signer_role, clearance_type, document_type, signer_name_snapshot, signature_storage_path, document_hash, signed_at")
      .eq("enrollment_id", enrollment.id)
      .order("signed_at", { ascending: true }),
    supabase
      .from("enrollment_clearances")
      .select("clearance_type, status")
      .eq("enrollment_id", enrollment.id)
  ]);

  if (signatureResponse.error) return { signatures: [], error: signatureResponse.error };
  if (clearanceResponse.error) return { signatures: [], error: clearanceResponse.error };

  const clearanceStatuses = new Map(
    ((clearanceResponse.data as Array<{ clearance_type: SignatureClearanceType; status: EnrollmentClearanceStatus }> | null) ?? [])
      .map((clearance) => [clearance.clearance_type, clearance.status])
  );

  const rows = (signatureResponse.data as Array<Pick<EnrollmentSignature, "id" | "enrollment_id" | "student_id" | "signer_profile_id" | "signer_role" | "clearance_type" | "document_type" | "signer_name_snapshot" | "signature_storage_path" | "document_hash" | "signed_at">> | null) ?? [];
  let admin: ReturnType<typeof createSupabaseAdminClient> | null = null;
  if (rows.length) {
    try {
      admin = createSupabaseAdminClient();
    } catch {
      admin = null;
    }
  }

  const signatures = await Promise.all(rows.map(async (row) => {
    const definition = getClearanceDefinition(row.clearance_type);
    let expectedHash: string | null = null;

    if (row.clearance_type === "HEALTH_CLEARANCE" && healthRequirement?.applicability === "APPLICABLE" && healthRequirement.status === "VERIFIED") {
      expectedHash = computeHealthRecordDocumentHash({
        enrollmentId: enrollment.id,
        studentId: row.student_id,
        academicYear: enrollment.academic_year,
        semester: enrollment.semester,
        applicability: "APPLICABLE",
        status: "VERIFIED"
      });
    } else if (definition && row.clearance_type !== "HEALTH_CLEARANCE") {
      expectedHash = computeEnrollmentDocumentHash(
        enrollment,
        row.signer_role,
        row.clearance_type as SignatureClearanceType,
        definition.documentType
      );
    }

    const isCurrent = Boolean(
      expectedHash &&
      clearanceStatuses.get(row.clearance_type) === "SIGNED" &&
      expectedHash === row.document_hash
    );
    let signedUrl: string | null = null;
    if (isCurrent && admin) {
      const signedUrlResponse = await admin.storage.from("enrollment-signatures").createSignedUrl(row.signature_storage_path, 3600);
      signedUrl = signedUrlResponse.data?.signedUrl ?? null;
    }

    return { ...row, signed_url: signedUrl, is_current: isCurrent };
  }));

  return { signatures, error: null };
}

export function signatureEvidenceByClearance(signatures: PresentedEnrollmentSignature[]) {
  const latestByClearance = new Map<SignatureClearanceType, PresentedEnrollmentSignature>();
  for (const signature of signatures) {
    const existing = latestByClearance.get(signature.clearance_type);
    if (!existing || new Date(signature.signed_at).getTime() >= new Date(existing.signed_at).getTime()) {
      latestByClearance.set(signature.clearance_type, signature);
    }
  }

  return Object.fromEntries(
    [...latestByClearance.values()].map((signature) => [signature.clearance_type, {
      exists: true,
      isCurrent: signature.is_current,
      signerName: signature.signer_name_snapshot,
      signedAt: signature.signed_at,
      signedUrl: signature.signed_url,
      inputType: "DRAWN" as const
    }])
  );
}
