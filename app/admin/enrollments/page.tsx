import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentReviewControls } from "@/components/admin/enrollment-review-controls";
import { requireRegistrarAdmin } from "@/lib/auth/session";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import { formatDate, formatName } from "@/lib/utils/format";
import { computeEnrollmentDocumentHash, computeHealthRecordDocumentHash } from "@/lib/signatures/fingerprint";
import type { StudentRequirementRecord } from "@/lib/requirements/types";
import type { Enrollment, OfficialStudentRecord, Profile, Semester, Student } from "@/types/database";

type EnrollmentRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

type RequirementRow = Pick<
  StudentRequirementRecord,
  "student_id" | "academic_year" | "semester" | "applicability" | "status" | "note"
>;

type OfficialRecordGenderRow = Pick<OfficialStudentRecord, "student_id_number" | "gender_sex">;
type NurseSignatureRow = {
  id: string;
  enrollment_id: string;
  signer_name_snapshot: string;
  document_hash: string;
  signed_at: string;
};
type ClearanceStatusRow = {
  enrollment_id: string;
  clearance_type: "HEALTH_CLEARANCE";
  status: "PENDING" | "SIGNED" | "NOT_APPLICABLE" | "INVALIDATED";
};

function requirementKey(studentId: string, academicYear: string | null, semester: string | null) {
  return `${studentId}:${academicYear ?? ""}:${semester ?? ""}`;
}

const SUPPORTED_SEMESTERS: Semester[] = ["1st Semester", "2nd Semester"];
const ACADEMIC_YEAR_REGEX = /^\d{4}-\d{4}$/;

export default async function PendingEnrollmentsPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; success?: string; email?: string; academic_year?: string; semester?: string }>;
}) {
  const { supabase } = await requireRegistrarAdmin();
  const params = (await searchParams) ?? {};

  const activeTermResult = await getActiveEnrollmentTermResult(supabase);

  if (!activeTermResult.ok) {
    console.error("pending_enrollments:active_term_load");
    return (
      <Card>
        <CardHeader
          title="Pending Enrollments"
          description="Submitted Online Enrollment requests awaiting Registrar review."
        />
        <EmptyState
          title="Pending enrollments could not be loaded"
          description="Please try again. No enrollment decisions can be made until term information is available."
        />
      </Card>
    );
  }

  const activeTerm = activeTermResult.term;

  const rawAcademicYear = (params.academic_year ?? "").trim();
  const rawSemester = (params.semester ?? "").trim();

  const validAcademicYear = ACADEMIC_YEAR_REGEX.test(rawAcademicYear) ? rawAcademicYear : null;
  const validSemester = SUPPORTED_SEMESTERS.includes(rawSemester as Semester)
    ? (rawSemester as Semester)
    : null;

  const hasExplicitTermFilter = Boolean(validAcademicYear && validSemester);

  const filterAcademicYear = hasExplicitTermFilter
    ? (validAcademicYear as string)
    : activeTerm?.academicYear ?? null;

  const filterSemester = hasExplicitTermFilter
    ? (validSemester as Semester)
    : activeTerm?.semester ?? null;

  if (!filterAcademicYear || !filterSemester) {
    return (
      <Card>
        <CardHeader
          title="Pending Enrollments"
          description="No active enrollment term is currently configured in the database."
        />
        <div className="p-4">
          <p className="mb-4 text-sm text-slateui-secondary">
            Select a term filter below to view historical pending enrollment requests:
          </p>
          <div className="flex flex-wrap gap-2">
            {["2024-2025", "2025-2026", "2026-2027"].flatMap((ay) =>
              ["1st Semester", "2nd Semester"].map((sem) => (
                <ButtonLink
                  key={`${ay}:${sem}`}
                  href={`/admin/enrollments?academic_year=${ay}&semester=${encodeURIComponent(sem)}`}
                  variant="outline"
                  className="text-xs"
                >
                  {ay} {sem}
                </ButtonLink>
              ))
            )}
          </div>
        </div>
      </Card>
    );
  }

  const academicYear = filterAcademicYear!;
  const semester = filterSemester!;
  const query = supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*), enrollment_subjects(id, course_code, course_description, units)")
    .eq("status", "PENDING")
    .eq("academic_year", academicYear)
    .eq("semester", semester);

  const { data, error: enrollmentsError } = await query.order("submitted_at", { ascending: true });

  if (enrollmentsError) {
    console.error("pending_enrollments:load", enrollmentsError);
    return (
      <Card>
        <CardHeader
          title="Pending Enrollments"
          description={`Term: AY ${academicYear}, ${semester}`}
        />
        <EmptyState
          title="Pending enrollments could not be loaded"
          description="Please try again. Query for the selected term failed."
        />
      </Card>
    );
  }

  const enrollments = (data as EnrollmentRow[] | null) ?? [];

  const errorMessages: Record<string, string> = {
    not_found: "Enrollment request is not available. Refresh the pending list.",
    already_reviewed: "This enrollment request has already been reviewed. Refresh the pending list.",
    invalid_request: "Enrollment request could not be reviewed. Please try again.",
    review_failed: "Enrollment request could not be reviewed. Please try again.",
    invalid_enrollment_load: "This enrollment cannot be approved because its subject load is missing or invalid.",
    unverified_requirements: "Applicable Health Record Update verification is still pending for this enrollment term."
  };

  const successMessages: Record<string, string> = {
    approved: "Enrollment request approved successfully.",
    rejected: "Enrollment request rejected successfully."
  };

  const emailMessages: Record<string, string> = {
    sent: "The student notification was sent to the configured email provider.",
    not_configured: "The decision was saved, but the student notification could not be sent. Contact the student manually.",
    failed: "The decision was saved, but the student notification could not be sent. Contact the student manually."
  };

  const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.student_id))];
  const studentIdNumbers = [...new Set(enrollments.map((enrollment) => enrollment.students?.student_id_number).filter(Boolean))] as string[];

  const [requirementsResult, officialRecordsResult, nurseSignaturesResult, clearanceStatusesResult] = await Promise.all([
    studentIds.length
      ? supabase
          .from("student_requirements")
          .select("student_id, academic_year, semester, applicability, status, note")
          .in("student_id", studentIds)
          .eq("requirement_code", "HEALTH_RECORD_UPDATE")
          .eq("academic_year", academicYear as string)
          .eq("semester", semester as string)
      : Promise.resolve({ data: [], error: null }),
    studentIdNumbers.length
      ? supabase
          .from("official_student_records")
          .select("student_id_number, gender_sex")
          .in("student_id_number", studentIdNumbers)
      : Promise.resolve({ data: [], error: null }),
    enrollments.length
      ? supabase
          .from("enrollment_signatures")
          .select("id, enrollment_id, signer_name_snapshot, document_hash, signed_at")
          .in("enrollment_id", enrollments.map((enrollment) => enrollment.id))
          .eq("signer_role", "NURSE")
          .eq("clearance_type", "HEALTH_CLEARANCE")
          .order("signed_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    enrollments.length
      ? supabase
          .from("enrollment_clearances")
          .select("enrollment_id, clearance_type, status")
          .in("enrollment_id", enrollments.map((enrollment) => enrollment.id))
          .eq("clearance_type", "HEALTH_CLEARANCE")
      : Promise.resolve({ data: [], error: null })
  ]);

  if (requirementsResult.error) console.error("pending_enrollments:requirement_load");
  if (officialRecordsResult.error) console.error("pending_enrollments:official_record_load");
  if (nurseSignaturesResult.error) console.error("pending_enrollments:nurse_signature_load");
  if (clearanceStatusesResult.error) console.error("pending_enrollments:clearance_status_load");

  const requirementsByTerm = new Map(
    ((requirementsResult.data as RequirementRow[] | null) ?? []).map((requirement) => [
      requirementKey(requirement.student_id, requirement.academic_year, requirement.semester),
      requirement
    ])
  );
  const officialGenderByStudentId = new Map(
    ((officialRecordsResult.data as OfficialRecordGenderRow[] | null) ?? []).map((record) => [record.student_id_number ?? "", record.gender_sex])
  );
  const nurseSignatureByEnrollmentId = new Map<string, NurseSignatureRow>();
  for (const signature of (nurseSignaturesResult.data as NurseSignatureRow[] | null) ?? []) {
    if (!nurseSignatureByEnrollmentId.has(signature.enrollment_id)) {
      nurseSignatureByEnrollmentId.set(signature.enrollment_id, signature);
    }
  }
  const healthClearanceStatusByEnrollmentId = new Map(
    ((clearanceStatusesResult.data as ClearanceStatusRow[] | null) ?? []).map((clearance) => [clearance.enrollment_id, clearance.status])
  );
  const requirementDataUnavailable = Boolean(requirementsResult.error || officialRecordsResult.error || nurseSignaturesResult.error || clearanceStatusesResult.error);

  const isActiveTermFilter = Boolean(
    activeTerm && academicYear === activeTerm.academicYear && semester === activeTerm.semester
  );

  return (
    <Card>
      <CardHeader
        title="Pending Enrollments"
        description={`Showing pending requests for AY ${academicYear}, ${semester}.${
          isActiveTermFilter ? " (Authoritative Active Term)" : " (Historical Term Filter)"
        }`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slateui-border px-6 pb-4 text-sm">
        <span className="font-semibold text-slateui-text">Term Filter:</span>
        {activeTerm ? (
          <ButtonLink
            href="/admin/enrollments"
            variant={isActiveTermFilter ? "primary" : "outline"}
            className="text-xs"
          >
            Active Term ({activeTerm.label})
          </ButtonLink>
        ) : null}
        {["2024-2025", "2025-2026", "2026-2027"].flatMap((ay) =>
          ["1st Semester", "2nd Semester"].map((sem) => {
            const isSelected = academicYear === ay && semester === sem;
            if (activeTerm && activeTerm.academicYear === ay && activeTerm.semester === sem) {
              return null;
            }
            return (
              <ButtonLink
                key={`${ay}:${sem}`}
                href={`/admin/enrollments?academic_year=${ay}&semester=${encodeURIComponent(sem)}`}
                variant={isSelected ? "primary" : "outline"}
                className="text-xs"
              >
                {ay} {sem}
              </ButtonLink>
            );
          })
        )}
      </div>

      {params.success ? (
        <div role="status" aria-live="polite" className="mx-6 mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {successMessages[params.success] ?? "Action completed successfully."}
        </div>
      ) : null}
      {params.email && emailMessages[params.email] ? (
        <div
          role={params.email === "sent" ? "status" : "alert"}
          aria-live={params.email === "sent" ? "polite" : undefined}
          className={`mx-6 mb-4 rounded-md border px-4 py-3 text-sm font-medium ${params.email === "sent" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}
        >
          {emailMessages[params.email]}
        </div>
      ) : null}
      {params.error ? (
        <div role="alert" className="mx-6 mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessages[params.error] ?? "An error occurred."}
        </div>
      ) : null}
      {enrollments.length ? (
        <div className="px-6 pb-6">
          <p className="mb-2 text-xs text-slateui-muted sm:hidden">Swipe horizontally to view all enrollment details and actions.</p>
          <div className="overflow-hidden rounded-lg border border-slateui-border bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
                <thead className="bg-primary-800 text-white">
                  <tr>
                    {[
                      "Student name",
                      "Student ID",
                      "Program",
                      "Year level",
                      "Student type",
                      "Academic year",
                      "Semester",
                      "Submitted date",
                      "Status",
                      "Actions"
                    ].map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slateui-border">
                  {enrollments.map((enrollment) => {
                    const student = enrollment.students;
                    const profile = student?.profiles;
                    const requirement = requirementsByTerm.get(
                      requirementKey(enrollment.student_id, enrollment.academic_year, enrollment.semester)
                    );
                    const healthRequirementApplicability = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
                      student_type: student?.student_type ?? "",
                      official_gender_sex: officialGenderByStudentId.get(student?.student_id_number ?? "") ?? null
                    });
                    const healthRequirementStatus = healthRequirementApplicability === "APPLICABLE"
                      ? requirement?.status ?? "PENDING"
                      : "PENDING";
                    const nurseSignature = nurseSignatureByEnrollmentId.get(enrollment.id);
                    const isSpecial = healthRequirementApplicability === "APPLICABLE";
                    const nurseSignatureIsCurrent = Boolean(
                      nurseSignature &&
                      healthClearanceStatusByEnrollmentId.get(enrollment.id) === "SIGNED" &&
                      (
                        isSpecial
                          ? requirement?.status === "VERIFIED" &&
                            nurseSignature.document_hash === computeHealthRecordDocumentHash({
                              enrollmentId: enrollment.id,
                              studentId: enrollment.student_id,
                              academicYear: enrollment.academic_year,
                              semester: enrollment.semester,
                              applicability: "APPLICABLE",
                              status: "VERIFIED"
                            })
                          : nurseSignature.document_hash === computeEnrollmentDocumentHash(
                              enrollment,
                              "NURSE",
                              "HEALTH_CLEARANCE",
                              "ENROLLMENT_CLEARANCE"
                            )
                      )
                    );
                    const nurseSignatureStatus = requirementDataUnavailable
                      ? "UNAVAILABLE"
                      : nurseSignatureIsCurrent
                        ? "SIGNED"
                        : nurseSignature
                          ? "INVALIDATED"
                          : "MISSING";
                    return (
                      <tr key={enrollment.id} className="bg-white align-top">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slateui-text">
                          {formatName(profile?.first_name, profile?.last_name)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                          {student?.student_id_number ?? "Not provided"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">
                          {enrollment.programs?.name ?? "Not available"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.year_level}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{student?.student_type ?? ""}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.academic_year}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{enrollment.semester}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{formatDate(enrollment.submitted_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
                        </td>
                        <td className="min-w-[220px] whitespace-normal px-4 py-3">
                          <div className="space-y-3">
                            <ButtonLink
                              href={`/admin/enrollments/${enrollment.id}/registration`}
                              variant="outline"
                              className="w-full"
                            >
                              View/Print Form
                            </ButtonLink>
                            <EnrollmentReviewControls
                              enrollmentId={enrollment.id}
                              studentName={formatName(profile?.first_name, profile?.last_name)}
                              studentId={student?.student_id_number ?? "Not provided"}
                              email={profile?.email ?? "Not available"}
                              program={enrollment.programs?.name ?? "Not available"}
                              yearLevel={enrollment.year_level}
                              studentType={student?.student_type ?? "Not available"}
                              academicYear={enrollment.academic_year}
                              semester={enrollment.semester}
                              submittedAt={enrollment.submitted_at}
                              subjects={(enrollment.enrollment_subjects ?? []).map((subject) => ({
                                id: subject.id,
                                course_code: subject.course_code,
                                course_description: subject.course_description,
                                units: subject.units
                              }))}
                              healthRequirement={{
                                applicability: healthRequirementApplicability,
                                status: healthRequirementStatus,
                                note: healthRequirementApplicability === "APPLICABLE" ? requirement?.note ?? null : null,
                                unavailable: requirementDataUnavailable,
                                nurseSignatureStatus,
                                nurseSignerName: nurseSignature?.signer_name_snapshot ?? null,
                                nurseSignedAt: nurseSignature?.signed_at ?? null
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <EmptyState
            title="No pending enrollments found for this term."
            description={`No pending enrollment requests are recorded for AY ${academicYear}, ${semester}.`}
          />
        </div>
      )}
    </Card>
  );
}
