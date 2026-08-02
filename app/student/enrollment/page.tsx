import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentForm } from "@/components/forms/enrollment-form";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import {
  evaluateStandardLoadEligibility,
  getStudentSubmissionMessage
} from "@/lib/enrollment/student-submission";
import { getStandardLoadForStudent } from "@/lib/enrollment/standard-load";
import { formatName } from "@/lib/utils/format";
import type { Enrollment } from "@/types/database";

type TermEnrollment = Pick<Enrollment, "status" | "academic_year" | "semester">;

export default async function OnlineEnrollmentPage() {
  const { supabase, profile } = await requireRole("student");
  const studentResult = await getStudentQueryResult(profile.id);

  if (studentResult.status === "query_failed") {
    return (
      <EmptyState
        title="Student record could not be loaded."
        description="A database query error occurred. Please refresh or try again later."
      />
    );
  }

  if (studentResult.status === "not_found") {
    return <EmptyState title="Student record not found." description="Please contact the Registrar." />;
  }

  const student = studentResult.student;

  const activeTermResult = await getActiveEnrollmentTermResult(supabase);

  if (!activeTermResult.ok) {
    return (
      <EmptyState
        title="Enrollment information could not be loaded."
        description="Please try again."
      />
    );
  }

  if (!activeTermResult.term) {
    return (
      <EmptyState
        title="No active enrollment term is currently configured."
        description="Please contact the Registrar for academic calendar updates."
      />
    );
  }

  const activeTerm = activeTermResult.term;

  if (!activeTerm.enrollmentOpen) {
    return (
      <Card className="border-t-4 border-t-amber-500">
        <CardHeader title="Online Enrollment Closed" description={`Current term: ${activeTerm.label}`} />
        <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Online enrollment is not currently open for {activeTerm.label}.</p>
          <p className="mt-1">Please contact the Registrar for enrollment dates and submission instructions.</p>
          <ButtonLink className="mt-4" href="/student/enrollment-status" variant="outline">View Enrollment Status</ButtonLink>
        </div>
      </Card>
    );
  }

  const [standardLoad, enrollmentResult] = await Promise.all([
    getStandardLoadForStudent(supabase, student, activeTerm),
    supabase
      .from("enrollments")
      .select("status, academic_year, semester")
      .eq("student_id", student.id)
      .eq("academic_year", activeTerm.academicYear)
      .eq("semester", activeTerm.semester)
      .maybeSingle()
  ]);
  if (standardLoad.status === "query_failed" || enrollmentResult.error) {
    console.error("Enrollment information preload failed.", { stage: "preload" });
    return (
      <EmptyState
        title="Enrollment information could not be loaded."
        description="Please try again."
      />
    );
  }

  const existingEnrollment = enrollmentResult.data;

  const eligibility = evaluateStandardLoadEligibility({
    studentIdNumber: student.student_id_number,
    programId: student.program_id,
    yearLevel: student.year_level,
    studentType: student.student_type,
    standardLoadAvailability:
      standardLoad.status === "configured_complete" ? "configured_complete" : standardLoad.status
  });
  const eligibilityMessage = eligibility === "eligible" ? null : getStudentSubmissionMessage(eligibility);
  const termEnrollment = (existingEnrollment as TermEnrollment | null) ?? null;

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader title="Online Enrollment" description={`Enrollment Type: ${student.student_type}`} />
        <div className="mb-6 grid gap-4 border-l-4 border-primary-800 bg-primary-50 p-4 text-sm sm:grid-cols-3">
          <div>
            <p className="font-medium text-slateui-muted">Student ID</p>
            <p className="mt-1 font-semibold text-slateui-text">{student.student_id_number ?? "Not provided"}</p>
          </div>
          <div>
            <p className="font-medium text-slateui-muted">Full Name</p>
            <p className="mt-1 font-semibold text-slateui-text">{formatName(profile.first_name, profile.last_name)}</p>
          </div>
          <div>
            <p className="font-medium text-slateui-muted">Email Address</p>
            <p className="mt-1 break-all font-semibold text-slateui-text">{profile.email}</p>
          </div>
        </div>
        {termEnrollment ? (
          termEnrollment.status === "REJECTED" ? (
            <div className="border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-950 space-y-3">
              <p className="font-semibold">Your enrollment request for this term was rejected by the Registrar.</p>
              <p className="text-sm leading-6 text-red-900">
                This request cannot be automatically resubmitted for the same term. Please contact the Registrar for correction instructions.
              </p>
              <dl className="grid gap-3 sm:grid-cols-3">
                <div><dt className="font-medium">Academic Year</dt><dd>{termEnrollment.academic_year}</dd></div>
                <div><dt className="font-medium">Semester</dt><dd>{termEnrollment.semester}</dd></div>
                <div><dt className="font-medium">Current Status</dt><dd><Badge tone={enrollmentBadgeTone(termEnrollment.status)}>{termEnrollment.status}</Badge></dd></div>
              </dl>
              <ButtonLink className="mt-4" href="/student/enrollment-status" variant="outline">View Enrollment Status</ButtonLink>
            </div>
          ) : (
            <div className="border-l-4 border-sky-500 bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-semibold">An enrollment request already exists for this term.</p>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><dt className="font-medium">Academic Year</dt><dd>{termEnrollment.academic_year}</dd></div>
                <div><dt className="font-medium">Semester</dt><dd>{termEnrollment.semester}</dd></div>
                <div><dt className="font-medium">Current Status</dt><dd><Badge tone={enrollmentBadgeTone(termEnrollment.status)}>{termEnrollment.status}</Badge></dd></div>
              </dl>
              <ButtonLink className="mt-4" href="/student/enrollment-status" variant="outline">View Enrollment Status</ButtonLink>
            </div>
          )
        ) : eligibility === "eligible" && standardLoad.status === "configured_complete" ? (
          <EnrollmentForm
            student={student}
            activeTerm={activeTerm}
            standardLoad={standardLoad}
          />
        ) : (
          <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
            {eligibilityMessage}
          </div>
        )}
      </Card>
    </div>
  );
}
