import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { BrandMarks } from "@/components/layout/pkm-mark";
import { PrintButton } from "@/components/print/print-button";
import { formatDate, formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Student, Subject } from "@/types/database";

type EnrollmentSubjectRow = {
  id: string;
  subjects?: Subject | null;
};

export type PrintableEnrollment = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
  enrollment_subjects?: EnrollmentSubjectRow[] | null;
};

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="registration-print-detail rounded-md border border-slateui-border p-3">
      <dt className="text-xs font-semibold uppercase text-slateui-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slateui-text">{value}</dd>
    </div>
  );
}

export function RegistrationForm({ enrollment }: { enrollment: PrintableEnrollment }) {
  const generatedAt = new Date().toISOString();
  const student = enrollment.students;
  const profile = student?.profiles;
  const subjects = (enrollment.enrollment_subjects ?? [])
    .map((row) => row.subjects)
    .filter((subject): subject is Subject => Boolean(subject));
  const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);

  return (
    <section className="registration-print print-page rounded-lg border border-slateui-border bg-white p-6 shadow-sm">
      <div className="registration-print-header mb-6 flex flex-col gap-4 border-b border-slateui-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandMarks className="registration-print-marks mb-4" />
          <p className="text-sm font-semibold uppercase text-primary-800">Pambayang Kolehiyo ng Mauban</p>
          <h2 className="mt-1 text-2xl font-bold text-slateui-text">MVP Draft Printable Registration Form</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slateui-secondary">
            Draft only for MVP testing. This is generated from current enrollment data while the official PKM
            COR / registration form template is still pending.
          </p>
        </div>
        <PrintButton label="Print Form" />
      </div>

      <div className="registration-print-summary mb-6 grid gap-3 sm:grid-cols-3">
        <DetailItem label="Form Type" value="MVP draft registration form" />
        <DetailItem label="Generated Date" value={formatDate(generatedAt)} />
        <DetailItem label="Source" value="PKM-DES enrollment record" />
      </div>

      <dl className="registration-print-details grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DetailItem label="Student ID" value={student?.student_id_number ?? "Not provided"} />
        <DetailItem label="Student Name" value={formatName(profile?.first_name, profile?.last_name)} />
        <DetailItem label="Email Address" value={profile?.email ?? "Not available"} />
        <DetailItem label="Program" value={enrollment.programs?.name ?? "Not available"} />
        <DetailItem label="Year Level" value={enrollment.year_level} />
        <DetailItem label="Student Type" value={student?.student_type ?? "Not available"} />
        <DetailItem label="Academic Year" value={enrollment.academic_year} />
        <DetailItem label="Semester" value={enrollment.semester} />
        <div className="registration-print-detail rounded-md border border-slateui-border p-3">
          <dt className="text-xs font-semibold uppercase text-slateui-muted">Enrollment Status</dt>
          <dd className="mt-2">
            <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
          </dd>
        </div>
        <DetailItem label="Submitted Date" value={formatDate(enrollment.submitted_at)} />
        <DetailItem label="Reviewed Date" value={formatDate(enrollment.reviewed_at)} />
        <DetailItem label="Remarks" value={enrollment.remarks || "None"} />
      </dl>

      <div className="registration-print-notice mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        This printout is a draft system output for Registrar review and student reference. It is not an official
        Certificate of Registration until PKM supplies and approves the official registration form template.
      </div>

      <div className="registration-print-subjects mt-8">
        <div className="registration-print-subject-heading mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slateui-text">Attached Subjects</h3>
            <p className="text-sm text-slateui-muted">Subjects are attached from the enrolled year level and semester.</p>
          </div>
          <p className="text-sm font-semibold text-slateui-text">Total Units: {totalUnits}</p>
        </div>

        {subjects.length ? (
          <div className="registration-print-table-wrap overflow-hidden rounded-lg border border-slateui-border">
            <table className="registration-print-table min-w-full divide-y divide-slateui-border text-left text-sm">
              <thead className="bg-primary-800 text-white">
                <tr>
                  {["Subject Code", "Subject Name", "Units", "Year Level", "Semester"].map((column) => (
                    <th key={column} className="px-4 py-3 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slateui-border bg-white">
                {subjects.map((subject) => (
                  <tr key={subject.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slateui-text">{subject.course_code}</td>
                    <td className="px-4 py-3 text-slateui-secondary">{subject.course_description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{subject.units}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{subject.year_level}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{subject.semester}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slateui-surfaceAlt">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slateui-text" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slateui-text">{totalUnits}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slateui-border p-6 text-sm text-slateui-muted">
            No subjects are attached to this enrollment record.
          </div>
        )}
      </div>

      <div className="registration-print-signoff mt-8 grid gap-4 border-t border-slateui-border pt-6 sm:grid-cols-2">
        <div className="registration-print-signoff-card rounded-md border border-slateui-border p-4">
          <p className="text-xs font-semibold uppercase text-slateui-muted">Student Certification</p>
          <p className="mt-2 text-sm leading-6 text-slateui-secondary">
            The student certified the submitted online enrollment information during form submission.
          </p>
        </div>
        <div className="registration-print-signoff-card rounded-md border border-slateui-border p-4">
          <p className="text-xs font-semibold uppercase text-slateui-muted">Registrar Review</p>
          <p className="mt-2 text-sm leading-6 text-slateui-secondary">
            Approval status, review date, and remarks are displayed from the current enrollment record.
          </p>
        </div>
      </div>
    </section>
  );
}
