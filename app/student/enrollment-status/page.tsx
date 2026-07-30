import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { getDisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import { formatDate } from "@/lib/utils/format";
import type { EnrollmentReviewStatus } from "@/types/database";
import { ENABLE_STUB_PAGES } from "@/lib/constants/navigation";

type StatusEnrollmentRow = {
  id: string;
  academic_year: string;
  semester: string;
  status: EnrollmentReviewStatus;
  submitted_at: string;
  reviewed_at: string | null;
  remarks: string | null;
};

export default async function EnrollmentStatusPage() {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const [activeTermResult, enrollmentsResponse] = await Promise.all([
    getActiveEnrollmentTermResult(supabase),
    supabase
      .from("enrollments")
      .select("id, academic_year, semester, status, submitted_at, reviewed_at, remarks")
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false })
  ]);

  if (!activeTermResult.ok || enrollmentsResponse.error) {
    console.error("student_enrollment_status:load", {
      activeTermOk: activeTermResult.ok,
      enrollmentError: enrollmentsResponse.error
    });
    return (
      <EmptyState
        title="Enrollment status could not be loaded."
        description="Please try again. If the issue persists, contact the Registrar."
      />
    );
  }

  const activeTerm = activeTermResult.term;
  const allEnrollments = (enrollmentsResponse.data as StatusEnrollmentRow[] | null) ?? [];

  const currentTermEnrollment = activeTerm
    ? allEnrollments.find(
        (e) => e.academic_year === activeTerm.academicYear && e.semester === activeTerm.semester
      ) ?? null
    : null;

  const historicalEnrollments = activeTerm
    ? allEnrollments.filter(
        (e) => e.academic_year !== activeTerm.academicYear || e.semester !== activeTerm.semester
      )
    : allEnrollments;

  let currentTermRequirement: StudentRequirementRecord | null = null;
  let requirementError = false;

  if (activeTerm) {
    const { data: requirementData, error } = await supabase
      .from("student_requirements")
      .select("*")
      .eq("student_id", student.id)
      .eq("requirement_code", "HEALTH_RECORD_UPDATE")
      .eq("academic_year", activeTerm.academicYear)
      .eq("semester", activeTerm.semester)
      .maybeSingle();

    if (error) {
      requirementError = true;
      console.error("student_enrollment_status:requirement_load", error);
    } else {
      currentTermRequirement = (requirementData as StudentRequirementRecord | null) ?? null;
    }
  }

  let healthRequirementApplicability = currentTermRequirement?.applicability ?? null;
  let officialRecordError = false;

  if (activeTerm) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: officialRecord, error } = await admin
        .from("official_student_records")
        .select("gender_sex")
        .eq("student_id_number", student.student_id_number ?? "")
        .maybeSingle();

      if (error) {
        officialRecordError = true;
        console.error("student_enrollment_status:official_record_load", error);
      } else {
        healthRequirementApplicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
          student_type: student.student_type,
          official_gender_sex: officialRecord?.gender_sex ?? null
        });
      }
    } catch {
      officialRecordError = true;
      console.error("student_enrollment_status:official_record_load");
    }
  }

  const status = getDisplayedEnrollmentStatus(
    currentTermEnrollment?.status ?? null,
    student.enrollment_status
  );

  const statusPanelClass = status === "ENROLLED"
    ? "border-green-600 bg-green-50"
    : status === "PENDING"
      ? "border-amber-500 bg-amber-50"
      : status === "REJECTED"
        ? "border-red-600 bg-red-50"
        : "border-primary-800 bg-primary-50";

  const actions = status === "ENROLLED"
    ? [["/student/cor", "Print Draft Registration Form", "secondary"], ["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]]
    : status === "NOT ENROLLED"
      ? [["/student/enrollment", "Online Enrollment", "primary"], ["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]]
      : [["/student/subjects", "View Subject List", "outline"], ["/student/account", "Account", "outline"]];

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader
          title="Enrollment Status Result"
          description={
            activeTerm
              ? activeTerm.label
              : "No active enrollment term is currently configured."
          }
        />
        <div className={`border-l-4 p-5 ${statusPanelClass}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slateui-text">Current term enrollment result</p>
              <p className="mt-1 text-sm leading-6 text-slateui-secondary">
                {activeTerm
                  ? currentTermEnrollment
                    ? `Your enrollment request for ${activeTerm.label}.`
                    : `No enrollment request is currently recorded for ${activeTerm.label}.`
                  : "No active academic term configured."}
              </p>
            </div>
            <Badge tone={enrollmentBadgeTone(status)}>{status}</Badge>
          </div>

          {status === "PENDING" ? (
            <div className="mt-4 space-y-2">
              <p className="text-base font-semibold text-slateui-text">
                Your enrollment request has been submitted and is pending approval.
              </p>
              <p className="text-sm leading-6 text-slateui-secondary">
                Submitted: {formatDate(currentTermEnrollment?.submitted_at)}
              </p>
            </div>
          ) : status === "ENROLLED" ? (
            <div className="mt-4 space-y-2">
              <p className="text-base font-semibold text-slateui-text">Congratulations! You are now officially enrolled.</p>
              <p className="text-sm leading-6 text-slateui-secondary">Please print your draft registration form.</p>
            </div>
          ) : status === "REJECTED" ? (
            <div className="mt-4 space-y-3">
              <p className="text-base font-semibold text-red-900">
                Your enrollment request was not approved by the Registrar.
              </p>
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                <p className="font-semibold">Registrar Remarks:</p>
                <p className="mt-1">{currentTermEnrollment?.remarks ? currentTermEnrollment.remarks : "No specific remarks were provided by the Registrar."}</p>
              </div>
              <p className="text-sm leading-6 text-slateui-secondary">
                This request cannot be automatically resubmitted for the same term. Please contact the Registrar for correction instructions.
              </p>
              <p className="text-xs text-slateui-muted">
                Reviewed: {formatDate(currentTermEnrollment?.reviewed_at)}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-base font-semibold text-slateui-text">
              No active enrollment request is recorded for your account.
            </p>
          )}
        </div>

        <section className="mt-6 border border-slateui-border bg-slateui-surfaceAlt p-4" aria-labelledby="health-record-update">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="health-record-update" className="text-base font-bold text-slateui-text">Health Record Update</h2>
              <p className="mt-1 text-sm leading-6 text-slateui-secondary">
                Current term: {activeTerm ? activeTerm.label : "No active term"}
              </p>
            </div>
            {healthRequirementApplicability === "APPLICABLE" ? (
              <Badge tone={currentTermRequirement?.status === "VERIFIED" ? "success" : currentTermRequirement?.status === "REJECTED" ? "error" : "warning"}>
                {currentTermRequirement?.status ?? "PENDING"}
              </Badge>
            ) : healthRequirementApplicability === "NOT_APPLICABLE" ? <Badge tone="info">NOT REQUIRED</Badge> : null}
          </div>
          {requirementError || officialRecordError ? (
            <p className="mt-3 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">Current-term requirement information could not be loaded. Please contact the Registrar.</p>
          ) : healthRequirementApplicability === "APPLICABLE" ? (
            <div className="mt-3 space-y-2 text-sm leading-6 text-slateui-secondary">
              <p>Submit the required paper form directly to PKM Health Services. PKM-DES records only the verification status; do not upload medical details.</p>
              {(currentTermRequirement?.status ?? "PENDING") === "PENDING" ? <p className="font-semibold text-amber-900">Registrar approval remains unavailable until this paper form is verified for the current term.</p> : null}
              {currentTermRequirement?.status === "REJECTED" ? <p className="font-semibold text-red-800">Please contact the Registrar or PKM Health Services about the paper-form verification.</p> : null}
            </div>
          ) : healthRequirementApplicability === "NOT_APPLICABLE" ? (
            <p className="mt-3 text-sm leading-6 text-slateui-secondary">No Health Record Update verification is required for your current-term enrollment request.</p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slateui-secondary">Current-term Health Record Update status appears after an enrollment request is recorded, when applicable.</p>
          )}
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map(([href, label, variant]) => <ButtonLink key={href} href={href} variant={variant as "primary" | "secondary" | "outline"} className="w-full">{label}</ButtonLink>)}
          {ENABLE_STUB_PAGES ? <><ButtonLink href="/student/grades" variant="outline" className="w-full">View Grades</ButtonLink><ButtonLink href="/student/schedule" variant="outline" className="w-full">View Class Schedule</ButtonLink><ButtonLink href="/student/balances" variant="outline" className="w-full">View Balances</ButtonLink></> : null}
        </div>
      </Card>

      {historicalEnrollments.length > 0 ? (
        <Card className="border-t-4 border-t-slate-600">
          <CardHeader
            title="Previous Enrollment History"
            description="Your past enrollment records from prior academic terms."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slateui-border bg-slateui-surfaceAlt text-xs font-semibold uppercase tracking-wider text-slateui-muted">
                <tr>
                  <th className="px-4 py-3">Academic Term</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted Date</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-border">
                {historicalEnrollments.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 font-semibold text-slateui-text">
                      {record.academic_year} – {record.semester}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={enrollmentBadgeTone(record.status)}>{record.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slateui-secondary">
                      {formatDate(record.submitted_at)}
                    </td>
                    <td className="px-4 py-3 text-slateui-secondary">
                      {record.remarks ? record.remarks : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
