import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ResetStudentPasswordForm } from "@/components/admin/reset-student-password-form";
import { OfficialStudentRecordForm } from "../../official-record-form";
import { resetStudentPasswordAction, updateOfficialStudentRecordAction } from "../../actions";
import { isExactActiveStudentAccount } from "@/lib/admin-student-records/password-reset";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { OFFICIAL_RECORD_ERROR_MESSAGES } from "@/lib/constants/pkm";
import type { OfficialStudentRecord, Program } from "@/types/database";

type EditPageParams = {
  recordId: string;
};

export default async function EditOfficialStudentRecordPage({
  params,
  searchParams
}: {
  params: Promise<EditPageParams>;
  searchParams?: Promise<{ updated?: string; error?: string; email_mismatch?: string }>;
}) {
  const { supabase } = await requireRegistrarAdmin();
  const { recordId } = await params;
  const query = (await searchParams) ?? {};
  const [{ data: programsData, error: programsError }, { data: recordData, error: recordError }] = await Promise.all([
    supabase.from("programs").select("*").order("name"),
    supabase
      .from("official_student_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle()
  ]);

  const programs = (programsData as Program[] | null) ?? [];
  const record = (recordData as OfficialStudentRecord | null) ?? null;

  if (programsError) {
    console.error("official_student_records:programs_load");
    return (
      <EmptyState
        title="Programs could not be loaded."
        description="This official student record cannot be edited until program information is available. Please try again."
        action={<ButtonLink href="/admin/students" variant="outline">Back to Student Records</ButtonLink>}
      />
    );
  }

  if (recordError) {
    console.error("official_student_records:records_load");
    return (
      <EmptyState
        title="Official student record could not be loaded."
        description="Please try again. No record details are shown until the current information can be loaded."
        action={<ButtonLink href="/admin/students" variant="outline">Back to Student Records</ButtonLink>}
      />
    );
  }

  if (!record) {
    return (
      <EmptyState
        title="Official student record not found."
        description="The selected Registrar-managed record may have been removed or is unavailable."
        action={<ButtonLink href="/admin/students" variant="outline">Back to Student Records</ButtonLink>}
      />
    );
  }

  const { data: accountStudent, error: accountStudentError } = record.id
    ? await supabase
        .from("students")
        .select("profile_id, student_id_number, official_record_id")
        .eq("official_record_id", record.id)
        .maybeSingle()
    : { data: null, error: null };
  const { data: accountProfile, error: accountProfileError } = accountStudent
    ? await supabase
        .from("profiles")
        .select("email, role, account_status")
        .eq("id", accountStudent.profile_id)
        .maybeSingle()
    : { data: null, error: null };
  const passwordResetAvailable = !accountStudentError && !accountProfileError && isExactActiveStudentAccount({
    officialEmail: record.email,
    officialStudentId: record.student_id_number,
    accountEmail: accountProfile?.email ?? null,
    accountStudentId: accountStudent?.student_id_number ?? null,
    accountRole: accountProfile?.role ?? null,
    accountStatus: accountProfile?.account_status ?? null,
    linkedRecordId: accountStudent?.official_record_id ?? null,
    expectedRecordId: record.id
  });

  if (accountStudentError || accountProfileError) {
    console.error("official_student_records:password_reset_account_lookup");
  }

  return (
    <div className="space-y-4">
      <div>
        <ButtonLink href="/admin/students" variant="outline" className="px-3 py-1 text-xs">
          ← Back to Student Records
        </ButtonLink>
      </div>
      <Card>
        <CardHeader
          title="Edit Official Student Record"
          description="Update Registrar-managed data used for account matching."
          action={<ButtonLink href="/admin/students" variant="outline">Back to Records</ButtonLink>}
        />
        {query.updated ? (
          <div className="mb-4 space-y-2">
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              Official student record updated and linked student account fields synchronized.
            </div>
            {query.email_mismatch ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                Email differs; account email not changed. Supabase Auth and profile email address remain unchanged.
              </div>
            ) : null}
          </div>
        ) : null}
        {query.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {OFFICIAL_RECORD_ERROR_MESSAGES[query.error] ?? "Official student record could not be updated."}
          </div>
        ) : null}
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Student ID, name, program, year level, and student type synchronize to the linked student account through the synchronization RPC. Official-record email changes do not silently change Supabase Auth or profile email. Email mismatch must remain explicit. Ambiguous or unlinked legacy records are not automatically attached.
        </div>
        <OfficialStudentRecordForm
          action={updateOfficialStudentRecordAction}
          programs={programs}
          record={record}
          submitLabel="Update Official Record"
        />
      </Card>
      <Card className="border-t-4 border-t-secondary-600">
        <CardHeader
          title="Student Password Reset"
          description="Reset is available only for an exact active student account matched to this official record."
        />
        {passwordResetAvailable ? (
          <ResetStudentPasswordForm action={resetStudentPasswordAction} officialRecordId={record.id} />
        ) : (
          <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            A password reset becomes available after this official record has an exact active student account match. Account matching identifiers must remain aligned.
          </div>
        )}
      </Card>
    </div>
  );
}
