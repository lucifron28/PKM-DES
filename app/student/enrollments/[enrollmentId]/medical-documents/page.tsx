import { notFound } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { MedicalDocumentUpload } from "@/components/forms/medical-document-upload";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { isRequirementUuid } from "@/lib/requirements/rules";
import { loadMedicalDocuments } from "@/lib/requirements/medical-documents";
import { formatDate } from "@/lib/utils/format";

export default async function StudentMedicalDocumentsPage({ params }: { params: Promise<{ enrollmentId: string }> }) {
  const { enrollmentId } = await params;
  if (!isRequirementUuid(enrollmentId)) notFound();
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentQueryResult(profile.id);
  if (student.status !== "found") notFound();
  const { data, error } = await supabase.from("enrollments").select("id, student_id, status, academic_year, semester")
    .eq("id", enrollmentId).eq("student_id", student.student.id).maybeSingle();
  if (error || !data) notFound();
  const result = await loadMedicalDocuments(supabase, enrollmentId);
  return <div className="space-y-6">
    <ButtonLink href="/student/enrollment-status" variant="outline">Back to Enrollment Status</ButtonLink>
    <Card><CardHeader title="Medical papers" description={`${data.academic_year}, ${data.semester}`} />
      {data.status === "PENDING" ? <MedicalDocumentUpload enrollmentId={enrollmentId} /> : <p>Uploads are available while enrollment is pending.</p>}
    </Card>
    <Card><CardHeader title="Submitted papers" />
      {result.error ? <p role="alert">Submitted papers could not be loaded. Please refresh.</p> : <ul className="space-y-3">
        {result.documents.map((document) => <li key={document.id}>
          {document.signed_url ? <a href={document.signed_url} target="_blank" rel="noopener noreferrer" className="underline">{document.original_file_name}</a> : document.original_file_name}
          <p className="text-sm">Submitted {formatDate(document.uploaded_at)}, revision {document.revision}</p>
        </li>)}
        {!result.documents.length ? <li>No supporting medical papers submitted.</li> : null}
      </ul>}
    </Card>
  </div>;
}
