import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { OfficialStudentRecordForm } from "../../official-record-form";
import { updateOfficialStudentRecordAction, OFFICIAL_RECORD_ERROR_MESSAGES } from "../../actions";
import { requireRole } from "@/lib/auth/session";
import type { OfficialStudentRecord, Program } from "@/types/database";

type EditPageParams = {
  recordId: string;
};

export default async function EditOfficialStudentRecordPage({
  params,
  searchParams
}: {
  params: Promise<EditPageParams>;
  searchParams?: Promise<{ updated?: string; error?: string }>;
}) {
  const { supabase } = await requireRole("admin");
  const { recordId } = await params;
  const query = (await searchParams) ?? {};
  const [{ data: programsData }, { data: recordData }] = await Promise.all([
    supabase.from("programs").select("*").order("name"),
    supabase
      .from("official_student_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle()
  ]);

  const programs = (programsData as Program[] | null) ?? [];
  const record = (recordData as OfficialStudentRecord | null) ?? null;

  if (!record) {
    return (
      <EmptyState
        title="Official student record not found."
        description="The selected Registrar-managed record may have been removed or is unavailable."
        action={<ButtonLink href="/admin/students" variant="outline">Back to Student Records</ButtonLink>}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Edit Official Student Record"
        description="Update Registrar-managed data used for account matching."
        action={<ButtonLink href="/admin/students" variant="outline">Back to Records</ButtonLink>}
      />
      {query.updated ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          Official student record updated.
        </div>
      ) : null}
      {query.error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {OFFICIAL_RECORD_ERROR_MESSAGES[query.error] ?? "Official student record could not be updated."}
        </div>
      ) : null}
      <OfficialStudentRecordForm
        action={updateOfficialStudentRecordAction}
        programs={programs}
        record={record}
        submitLabel="Update Official Record"
      />
    </Card>
  );
}
