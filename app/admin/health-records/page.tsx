import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ESignatureInput } from "@/components/signatures/e-signature-input";
import { verifyHealthClearanceAction } from "@/app/admin/enrollments/signature-actions";
import { requireOfficialSignerRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { SIGNATURE_BUCKET } from "@/lib/signatures/validation";
import { formatDate, formatName } from "@/lib/utils/format";
import type { NurseHealthRequirementWorkItem } from "@/types/database";

async function loadSignatureUrl(path: string | null, isCurrent: boolean) {
  if (!path || !isCurrent) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

function requirementTone(status: NurseHealthRequirementWorkItem["requirement_status"]) {
  if (status === "VERIFIED") return "success" as const;
  if (status === "REJECTED") return "error" as const;
  return "warning" as const;
}

export default async function HealthRecordsPage() {
  const { supabase, profile } = await requireOfficialSignerRole("NURSE");

  const { data, error } = await supabase.rpc("list_nurse_health_requirements");
  if (error) {
    console.error("health_records:worklist_load");
    return <EmptyState title="Health Record Verification is unavailable" description="The status-only Nurse worklist could not be loaded safely." />;
  }

  const rows = (data as NurseHealthRequirementWorkItem[] | null) ?? [];
  const signedUrls = new Map(
    await Promise.all(
      rows.map(async (row) => [row.enrollment_id, await loadSignatureUrl(row.nurse_signature_storage_path, row.nurse_signature_is_current)] as const)
    )
  );
  const signerName = formatName(profile.first_name, profile.last_name);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Health Record Verification"
          description="Status-only Nurse worklist for applicable Incoming 1st Year female students. Do not enter or display medical details here."
        />
        <p className="text-sm leading-6 text-slateui-secondary">
          A Nurse must draw and apply an authenticated e-signature before the Registrar can approve the enrollment. A verified requirement without a current Nurse signature remains blocked.
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState title="No applicable Health Record Updates" description="There are no pending or previously verified status-only Nurse records in your assigned scope." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => {
            const signedUrl = signedUrls.get(row.enrollment_id) ?? null;
            const signedSignature = row.nurse_signature_id && row.nurse_signature_is_current && row.nurse_signature_name && row.nurse_signature_signed_at
              ? {
                  signerName: row.nurse_signature_name,
                  signedAt: row.nurse_signature_signed_at,
                  signedUrl,
                  isCurrent: true,
                  inputType: "DRAWN" as const
                }
              : null;
            const canSign = row.enrollment_status === "PENDING" &&
              (row.requirement_status === "PENDING" || (row.requirement_status === "VERIFIED" && !row.nurse_signature_is_current));

            return (
              <Card key={row.enrollment_id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slateui-text">{row.student_name || "Student"}</h2>
                    <p className="mt-1 text-sm text-slateui-muted">{row.student_id_number || "Student ID unavailable"}</p>
                  </div>
                  <Badge tone={requirementTone(row.requirement_status)}>{row.requirement_status}</Badge>
                </div>

                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slateui-muted">Academic term</dt>
                    <dd className="font-semibold text-slateui-text">{row.academic_year} · {row.semester}</dd>
                  </div>
                  <div>
                    <dt className="text-slateui-muted">Enrollment</dt>
                    <dd className="font-semibold text-slateui-text">{row.enrollment_status}</dd>
                  </div>
                </dl>

                {signedSignature ? (
                  <ESignatureInput
                    action={verifyHealthClearanceAction}
                    enrollmentId={row.enrollment_id}
                    signerRole="NURSE"
                    clearanceType="HEALTH_CLEARANCE"
                    signerLabel="School Nurse"
                    signerName={signerName}
                    title="Nurse e-signature"
                    description="This immutable signature is the current Health Clearance evidence for this enrollment."
                    signedSignature={signedSignature}
                  />
                ) : canSign ? (
                  <ESignatureInput
                    action={verifyHealthClearanceAction}
                    enrollmentId={row.enrollment_id}
                    signerRole="NURSE"
                    clearanceType="HEALTH_CLEARANCE"
                    signerLabel="School Nurse"
                    signerName={signerName}
                    title="Apply Nurse e-signature"
                    description="Draw your signature in the canvas, confirm it is your own, and apply it to the status-only Health Record Update clearance."
                  />
                ) : row.requirement_status === "VERIFIED" ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                    The requirement is marked VERIFIED but has no current Nurse signature. Reset it to PENDING before re-signing.
                  </p>
                ) : (
                  <p className="rounded-md border border-slateui-border bg-slateui-surfaceAlt px-3 py-2 text-sm text-slateui-secondary">
                    This requirement is not currently signable.
                  </p>
                )}

                {row.nurse_signature_name && row.nurse_signature_signed_at && !signedSignature ? (
                  <p className="text-xs text-slateui-muted">Previous signature: {row.nurse_signature_name} on {formatDate(row.nurse_signature_signed_at)}. It is not current.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
