import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { HealthRecordUpdateForm } from "@/components/health/health-record-update-form";
import { HealthRecordUpdatePaper } from "@/components/health/health-record-update-paper";
import { saveHealthRecordUpdateAction } from "@/app/student/health-record/actions";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { loadHealthRecordUpdate } from "@/lib/health-records/repository";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { formatName } from "@/lib/utils/format";

type HealthEnrollmentRow = {
  id: string;
  student_id: string;
  year_level: string;
  academic_year: string;
  semester: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  students?: {
    id: string;
    profile_id: string;
    student_type: string;
    official_student_records?: { gender_sex: string | null } | null;
  } | null;
  programs?: { name: string } | null;
};

export default async function StudentHealthRecordPage({
  params
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);
  const { enrollmentId } = await params;

  if (studentResult.status === "query_failed") {
    return <EmptyState title="Student record could not be loaded." description="Please refresh and try again." />;
  }
  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found." description="Please contact the Registrar." />;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, student_id, year_level, academic_year, semester, status, students(id, profile_id, student_type, official_student_records(gender_sex)), programs(name)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (error) {
    console.error("student_health_record:enrollment_load");
    return <EmptyState title="Health Record Update could not be loaded." description="Please refresh and try again." />;
  }

  const enrollment = data as HealthEnrollmentRow | null;
  if (!enrollment || enrollment.student_id !== studentResult.student.id) {
    return <EmptyState title="Health Record Update not found." description="The selected enrollment is unavailable for your account." />;
  }

  const studentType = enrollment.students?.student_type ?? studentResult.student.student_type;
  const officialGender = enrollment.students?.official_student_records?.gender_sex ?? studentResult.student.official_student_records?.gender_sex ?? null;
  const applicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: studentType,
    official_gender_sex: officialGender
  });

  if (applicability !== "APPLICABLE") {
    return (
      <EmptyState
        title="Health Record Update not required"
        description="This form is only required for Transferees and Incoming 1st Year Students whose official Gender/Sex is Female."
        action={<ButtonLink href="/student/enrollment-status" variant="outline">Back to Enrollment Status</ButtonLink>}
      />
    );
  }

  const [requirementResult, healthRecordResult] = await Promise.all([
    supabase
      .from("student_requirements")
      .select("id, student_id, requirement_code, status, academic_year, semester, applicability, note, verified_at, verified_by, created_at, updated_at")
      .eq("student_id", studentResult.student.id)
      .eq("requirement_code", "HEALTH_RECORD_UPDATE")
      .eq("academic_year", enrollment.academic_year)
      .eq("semester", enrollment.semester)
      .maybeSingle(),
    loadHealthRecordUpdate(supabase, enrollment.id)
  ]);

  const requirement = (requirementResult.data as StudentRequirementRecord | null) ?? null;
  const record = healthRecordResult.record;
  // A legacy enrollment may already be approved while the new form record is
  // missing. Allow that record to be completed once so the Nurse can review it.
  const editable = enrollment.status !== "REJECTED"
    && requirement?.status !== "VERIFIED"
    && (enrollment.status === "PENDING" || (enrollment.status === "APPROVED" && !record));
  const dateLabel = new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date());
  const studentName = formatName(profile.first_name, profile.last_name);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print-hidden">
        <ButtonLink href="/student/enrollment-status" variant="outline">Back to Enrollment Status</ButtonLink>
        <span className="text-sm font-semibold text-slateui-secondary">{enrollment.academic_year} · {enrollment.semester}</span>
      </div>

      <Card>
        <CardHeader
          title="Health Record Update"
          description="Complete the form below for PKM Health Services. The School Nurse will review the submitted form before enrollment approval."
        />
        {requirementResult.error || healthRecordResult.error ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="alert">The Health Record Update could not be loaded safely. Please refresh or contact the Registrar.</p>
        ) : editable ? (
          <HealthRecordUpdateForm
            action={saveHealthRecordUpdateAction}
            enrollmentId={enrollment.id}
            studentName={studentName}
            program={enrollment.programs?.name ?? "Program unavailable"}
            yearLevel={enrollment.year_level}
            dateLabel={dateLabel}
            record={record}
          />
        ) : (
          <div className="space-y-4">
            <p className="rounded-md border border-primary-200 bg-primary-50 p-4 text-sm leading-6 text-primary-950">
              {requirement?.status === "VERIFIED" ? "This form has already been verified by the School Nurse and is read-only." : "This enrollment is not currently editable. The submitted form is shown below."}
            </p>
            <HealthRecordUpdatePaper
              studentName={studentName}
              program={enrollment.programs?.name ?? "Program unavailable"}
              yearLevel={enrollment.year_level}
              dateLabel={record ? new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(new Date(record.submitted_at)) : dateLabel}
              record={record}
            />
          </div>
        )}
      </Card>

      <p className="print-hidden text-xs leading-5 text-slateui-muted">Please enter only the information requested on this form. Health Record Update details are restricted to your account and PKM Health Services.</p>
    </div>
  );
}
