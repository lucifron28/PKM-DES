import { BrandMarks } from "@/components/layout/pkm-mark";
import { PrintButton } from "@/components/print/print-button";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import {
  getAcademicClassificationLabel,
  getRegistrationClassificationMarks,
  getRegistrationTotalUnits,
  sortRegistrationSubjects
} from "@/lib/registration-form/presentation";
import { formatDate, formatName } from "@/lib/utils/format";
import type { Enrollment, OfficialStudentRecord, Profile, Student, Subject } from "@/types/database";

type EnrollmentSubjectRow = {
  id: string;
  subjects?: Subject | null;
};

export type PrintableEnrollment = Enrollment & {
  students?: (Student & { profiles?: Profile | null; official_student_records?: OfficialStudentRecord | null }) | null;
  enrollment_subjects?: EnrollmentSubjectRow[] | null;
};

function FormField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`registration-print-field min-w-0 border-b border-black pb-1 ${className}`}>
      <p className="text-xs font-bold uppercase text-black">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-black">{value}</p>
    </div>
  );
}

function MarkBox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="registration-print-mark inline-flex items-center gap-2 text-xs font-bold uppercase text-black">
      <span className="flex h-4 w-4 items-center justify-center border border-black text-[10px] leading-none" aria-label={checked ? `${label}: selected` : `${label}: not selected`}>
        {checked ? "X" : ""}
      </span>
      {label}
    </span>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div className="registration-print-signature flex min-h-16 flex-col justify-end text-center">
      <div className="border-t border-black pt-1 text-xs font-bold uppercase text-black">{label}</div>
    </div>
  );
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase text-black">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-5 text-black">{value}</p>
    </div>
  );
}

export function RegistrationForm({ enrollment }: { enrollment: PrintableEnrollment }) {
  const generatedAt = new Date().toISOString();
  const student = enrollment.students;
  const profile = student?.profiles;
  const subjects = sortRegistrationSubjects(
    (enrollment.enrollment_subjects ?? [])
      .map((row) => row.subjects)
      .filter((subject): subject is Subject => Boolean(subject))
  );
  const totalUnits = getRegistrationTotalUnits(subjects);
  const marks = getRegistrationClassificationMarks(student?.student_type);
  const semesterAcademicYear = `${enrollment.semester} / ${enrollment.academic_year}`;
  const studentName = formatName(profile?.first_name, profile?.last_name);
  const reviewed = enrollment.reviewed_at ? formatDate(enrollment.reviewed_at) : "Not yet reviewed";

  return (
    <div className="space-y-4">
      <section className="print-hidden flex flex-col gap-4 rounded-lg border border-slateui-border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">PKM-DES Research MVP</p>
          <h2 className="mt-1 text-xl font-bold text-slateui-text">Draft Registration Form</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slateui-muted">
            Browser-print draft for review and reference. It is not an official Certificate of Registration.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
          <PrintButton label="Print Draft" />
        </div>
      </section>

      <section className="registration-print print-page rounded-lg border border-black bg-white p-4 sm:p-6">
        <header className="registration-print-header border-b-2 border-black pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <BrandMarks className="registration-print-marks mb-4" />
              <p className="text-sm font-bold uppercase text-black">Pambayang Kolehiyo ng Mauban</p>
              <p className="text-xs font-semibold text-black">Africandaisy St. Sitio Pilaway Brgy. Polo Mauban, Quezon</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-black">PKM-DES Research MVP</p>
              <p className="mt-1 inline-block border border-black px-2 py-1 text-xs font-bold uppercase text-black">Draft - Not Official COR</p>
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-black uppercase tracking-normal text-black">Registration Form</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-black">
            Browser-print draft based on the supplied registration form sample. Official template approval remains pending.
          </p>
        </header>

        <section className="registration-print-admin mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2" aria-labelledby="registration-student-details">
          <h3 id="registration-student-details" className="sr-only">Student and enrollment details</h3>
          <FormField label="Student Number" value={student?.student_id_number ?? "Not provided"} />
          <FormField label="Print Generated" value={formatDate(generatedAt)} />
          <FormField label="Student Name" value={studentName} />
          <FormField label="Program" value={enrollment.programs?.name ?? "Not available"} />
          <FormField label="Year Level" value={enrollment.year_level} />
          <FormField label="Section" value="Pending official section assignment" />
          <FormField label="Semester / Academic Year" value={semesterAcademicYear} />
          <FormField label="Address" value={student?.official_student_records?.address ?? "Not available in the current student record"} />
          <FormField label="Academic Classification" value={getAcademicClassificationLabel(student?.student_type)} className="sm:col-span-2" />
        </section>

        <section className="registration-print-classification mt-5 flex flex-wrap items-center gap-4 border-y border-black py-3" aria-labelledby="registration-classification">
          <p id="registration-classification" className="text-xs font-bold uppercase text-black">Classification</p>
          <MarkBox label="New" checked={marks.newStudent} />
          <MarkBox label="Old" checked={marks.oldStudent} />
          <MarkBox label="Transferee" checked={marks.transferee} />
          <MarkBox label="Regular" checked={marks.regular} />
          <MarkBox label="Irregular" checked={marks.irregular} />
        </section>

        <section className="registration-print-review mt-5 grid gap-4 rounded-md border border-black bg-white p-3 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="registration-review">
          <h3 id="registration-review" className="sr-only">Enrollment review details</h3>
          <ReviewDetail label="Review Status" value={enrollment.status} />
          <ReviewDetail label="Submitted" value={formatDate(enrollment.submitted_at)} />
          <ReviewDetail label="Reviewed" value={reviewed} />
          <ReviewDetail label="Remarks" value={enrollment.remarks || "None"} />
        </section>

        <p className="registration-print-notice mt-5 rounded-md border border-black px-4 py-3 text-sm leading-6 text-black">
          This browser-print draft is for Registrar review and student reference. It is not an official Certificate of Registration.
        </p>

        <section className="registration-print-subjects mt-5" aria-labelledby="registration-subject-load">
          <div className="registration-print-subject-heading flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="registration-subject-load" className="text-lg font-bold uppercase text-black">Subject Load</h3>
              <p className="registration-print-subject-note text-sm text-black">Time, day, and room are not configured and remain TBA.</p>
            </div>
            <p className="text-sm font-semibold text-black">Total Units: {totalUnits}</p>
          </div>

          {subjects.length ? (
            <>
              <p className="registration-print-scroll-hint print-hidden mt-3 text-sm text-slateui-muted">Scroll horizontally to view the complete subject table on narrow screens.</p>
              <div className="registration-print-table-wrap mt-3 overflow-x-auto rounded-lg border border-black">
                <table className="registration-print-table min-w-[720px] w-full table-fixed border-collapse text-left text-sm">
                  <thead className="bg-white text-black">
                    <tr>
                      <th scope="col" className="w-[15%] px-3 py-2 font-semibold">Subject Code</th>
                      <th scope="col" className="w-[43%] px-3 py-2 font-semibold">Subject Description</th>
                      <th scope="col" className="w-[12%] px-3 py-2 font-semibold">Time</th>
                      <th scope="col" className="w-[10%] px-3 py-2 font-semibold">Day</th>
                      <th scope="col" className="w-[12%] px-3 py-2 font-semibold">Room</th>
                      <th scope="col" className="w-[8%] px-3 py-2 text-right font-semibold">Units</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black bg-white">
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td className="break-words px-3 py-2 font-semibold text-black">{subject.course_code}</td>
                        <td className="break-words px-3 py-2 leading-5 text-black">{subject.course_description}</td>
                        <td className="px-3 py-2 text-black">TBA</td>
                        <td className="px-3 py-2 text-black">TBA</td>
                        <td className="px-3 py-2 text-black">TBA</td>
                        <td className="px-3 py-2 text-right text-black">{subject.units}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-black bg-white">
                    <tr>
                      <td className="px-3 py-2 text-sm font-semibold text-black" colSpan={5}>Total Units</td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-black">{totalUnits}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-black p-5 text-sm text-black">
              No subjects are attached to this enrollment record.
            </div>
          )}
        </section>

        <section className="registration-print-fees mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="registration-assessment">
          <div className="registration-print-fee-panel rounded-lg border border-black p-4">
            <h3 id="registration-assessment" className="text-sm font-bold uppercase text-black">Assessment of Tuition and Other School Fees</h3>
            <p className="mt-2 text-sm leading-6 text-black">Fee assessment is not calculated by the current research MVP.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <FormField label="Tuition Fee" value="Not configured" />
              <FormField label="Other School Fees" value="Not configured" />
              <FormField label="Scholarship" value="Not configured" />
              <FormField label="Total Assessment" value="Not configured" />
            </div>
            <div className="registration-print-payment mt-4 grid gap-3 sm:grid-cols-3">
              <FormField label="Date" value="" />
              <FormField label="Official Receipt Number" value="" />
              <FormField label="Amount" value="" />
            </div>
          </div>

          <div className="registration-print-privacy rounded-lg border border-black p-4 text-sm leading-6 text-black">
            <p>
              I hereby authorize the Pambayang Kolehiyo ng Mauban to collect, process, store and utilize my personal data
              for the management of my academic records and related administrative purposes. This includes, but is not
              limited to, the use of my data for instructional purposes, research, data and system improvements.
            </p>
          </div>
        </section>

        <section className="registration-print-signoff mt-8 grid gap-6 border-t border-black pt-8 sm:grid-cols-2 lg:grid-cols-5" aria-label="Clearance signature lines">
          <SignatureBlock label="Dean" />
          <SignatureBlock label="Librarian" />
          <SignatureBlock label="Nurse" />
          <SignatureBlock label="Accountant" />
          <SignatureBlock label="Registrar" />
        </section>
      </section>
    </div>
  );
}
