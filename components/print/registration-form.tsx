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

function FormField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`registration-print-field flex min-h-10 items-end gap-2 border-b border-slate-400 ${className}`}>
      <span className="shrink-0 text-xs font-bold uppercase text-slateui-text">{label}:</span>
      <span className="min-w-0 flex-1 pb-1 text-sm font-semibold text-slateui-text">{value}</span>
    </div>
  );
}

function MarkBox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="registration-print-mark inline-flex items-center gap-2 text-xs font-bold uppercase text-slateui-text">
      <span className="flex h-4 w-4 items-center justify-center border border-slate-700 text-[10px] leading-none">
        {checked ? "X" : ""}
      </span>
      {label}
    </span>
  );
}

function SignatureBlock({ label }: { label: string }) {
  return (
    <div className="registration-print-signature flex min-h-16 flex-col justify-end text-center">
      <div className="border-t border-slate-500 pt-1 text-xs font-bold uppercase text-slateui-text">{label}</div>
    </div>
  );
}

function getClassificationMarks(studentType: string | undefined) {
  return {
    newStudent: studentType === "Incoming 1st Year Student",
    oldStudent: studentType === "Old Student",
    transferee: studentType === "Transferee",
    regular: studentType === "Regular Student",
    irregular: studentType === "Irregular Student"
  };
}

function getAcademicStatus(studentType: string | undefined) {
  if (studentType === "Regular Student" || studentType === "Irregular Student") {
    return studentType.replace(" Student", "").toUpperCase();
  }

  return "FOR REGISTRAR CLASSIFICATION";
}

export function RegistrationForm({ enrollment }: { enrollment: PrintableEnrollment }) {
  const generatedAt = new Date().toISOString();
  const student = enrollment.students;
  const profile = student?.profiles;
  const subjects = (enrollment.enrollment_subjects ?? [])
    .map((row) => row.subjects)
    .filter((subject): subject is Subject => Boolean(subject));
  const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);
  const marks = getClassificationMarks(student?.student_type);
  const semesterAcademicYear = `${enrollment.semester} / ${enrollment.academic_year}`;
  const studentName = formatName(profile?.first_name, profile?.last_name);

  return (
    <section className="registration-print print-page rounded-lg border border-slateui-border bg-white p-6 shadow-sm">
      <div className="registration-print-header mb-5 flex flex-col gap-4 border-b-2 border-primary-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <BrandMarks className="registration-print-marks mb-4" />
          <p className="text-sm font-bold uppercase text-primary-800">Pambayang Kolehiyo ng Mauban</p>
          <p className="text-xs font-semibold text-slateui-secondary">
            Africandaisy St. Sitio Pilaway Brgy. Polo Mauban, Quezon
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-normal text-slateui-text">Registration Form</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slateui-secondary">
            MVP draft printout based on the supplied registration form sample. Official COR approval and final
            template confirmation are still pending.
          </p>
        </div>
        <PrintButton label="Print Form" />
      </div>

      <div className="registration-print-admin mb-5 grid gap-x-5 gap-y-2 md:grid-cols-2">
        <FormField label="Student No" value={student?.student_id_number ?? "Not provided"} />
        <FormField label="Date" value={formatDate(generatedAt)} />
        <FormField label="Name" value={studentName} />
        <FormField label="Year/Section" value={`${enrollment.year_level} / Section pending`} />
        <FormField label="Course" value={enrollment.programs?.name ?? "Not available"} />
        <FormField label="Semester/AY" value={semesterAcademicYear} />
        <FormField label="Address" value="Not available in enrollment record" />
        <FormField label="Status" value={getAcademicStatus(student?.student_type)} />
      </div>

      <div className="registration-print-classification mb-5 flex flex-wrap items-center gap-4 border-y border-slateui-border py-3">
        <p className="text-xs font-bold uppercase text-slateui-text">Classification:</p>
        <MarkBox label="New" checked={marks.newStudent} />
        <MarkBox label="Old" checked={marks.oldStudent} />
        <MarkBox label="Transferee" checked={marks.transferee} />
        <MarkBox label="Regular" checked={marks.regular} />
        <MarkBox label="Irregular" checked={marks.irregular} />
      </div>

      <div className="registration-print-review mb-5 grid gap-3 rounded-md border border-slateui-border bg-slateui-surfaceAlt p-3 text-sm md:grid-cols-4">
        <div>
          <p className="text-xs font-bold uppercase text-slateui-muted">Enrollment Review</p>
          <div className="mt-1">
            <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slateui-muted">Submitted</p>
          <p className="mt-1 font-semibold text-slateui-text">{formatDate(enrollment.submitted_at)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slateui-muted">Reviewed</p>
          <p className="mt-1 font-semibold text-slateui-text">{formatDate(enrollment.reviewed_at)}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-slateui-muted">Remarks</p>
          <p className="mt-1 font-semibold text-slateui-text">{enrollment.remarks || "None"}</p>
        </div>
      </div>

      <div className="registration-print-notice mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        This printout is a draft system output for Registrar review and student reference. It is not an official
        Certificate of Registration until PKM confirms and approves the official registration form template.
      </div>

      <div className="registration-print-subjects">
        <div className="registration-print-subject-heading mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold uppercase text-slateui-text">Subject Load</h3>
            <p className="registration-print-subject-note text-sm text-slateui-muted">
              Time, day, and room remain placeholders until official schedule data is encoded.
            </p>
          </div>
          <p className="text-sm font-semibold text-slateui-text">Total Units: {totalUnits}</p>
        </div>

        {subjects.length ? (
          <div className="registration-print-table-wrap overflow-hidden rounded-lg border border-slateui-border">
            <table className="registration-print-table min-w-full divide-y divide-slateui-border text-left text-sm">
              <thead className="bg-primary-800 text-white">
                <tr>
                  {["Subject Code", "Subject Description", "Time", "Day", "Room", "Unit"].map((column) => (
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
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">TBA</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">TBA</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">TBA</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slateui-secondary">{subject.units}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slateui-surfaceAlt">
                <tr>
                  <td className="px-4 py-3 text-sm font-semibold text-slateui-text" colSpan={2}>
                    Total
                  </td>
                  <td colSpan={3} />
                  <td className="px-4 py-3 text-sm font-semibold text-slateui-text">{totalUnits}</td>
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

      <div className="registration-print-fees mt-6 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <div className="overflow-hidden rounded-lg border border-slateui-border">
          <div className="bg-primary-800 px-4 py-2 text-sm font-bold uppercase text-white">
            Assessment of Tuition and Other School Fees (TOSF)
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            <div className="border-b border-slateui-border p-4 md:border-b-0 md:border-r">
              <p className="mb-2 text-xs font-bold uppercase text-slateui-text">Miscellaneous Fee</p>
              {[
                "Admission Fee",
                "Athletic Fee",
                "Computer Fee",
                "Cultural Fee",
                "Development Fee",
                "Entrance Fee",
                "Guidance Fee",
                "Handbook Fee",
                "Laboratory Fee",
                "Library Fee",
                "Medical and Dental Fee",
                "Registration Fee",
                "School ID Fee"
              ].map((fee) => (
                <div key={fee} className="flex justify-between gap-3 border-b border-slate-100 py-1 text-xs">
                  <span>{fee}</span>
                  <span className="font-semibold">--</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between gap-3 text-xs font-bold uppercase">
                <span>Total</span>
                <span>Pending</span>
              </div>
            </div>
            <div className="space-y-3 p-4 text-xs">
              <FormField label="Tuition Fee" value="Pending official Finance rules" />
              <FormField label="NSTP Fee (CWTS)" value="Pending official Finance rules" />
              <FormField label="Scholarship" value="Pending official scholarship rules" />
              <FormField label="Total TOSF" value="Pending official Finance rules" />
              <div className="registration-print-payment mt-4 grid grid-cols-3 gap-2">
                <FormField label="Date" value="" />
                <FormField label="O.R. No" value="" />
                <FormField label="Amount" value="" />
              </div>
            </div>
          </div>
        </div>

        <div className="registration-print-privacy rounded-lg border border-slateui-border p-4 text-sm leading-6 text-slateui-secondary">
          <p>
            I hereby authorize the Pambayang Kolehiyo ng Mauban to collect, process, store and utilize my personal data
            for the management of my academic records and related administrative purposes. This includes, but is not
            limited to, the use of my data for instructional purposes, research, data and system improvements.
          </p>
        </div>
      </div>

      <div className="registration-print-signoff mt-8 grid gap-6 border-t border-slateui-border pt-8 sm:grid-cols-2 lg:grid-cols-5">
        <SignatureBlock label="Dean" />
        <SignatureBlock label="Librarian" />
        <SignatureBlock label="Nurse" />
        <SignatureBlock label="Accountant" />
        <SignatureBlock label="Registrar" />
      </div>
    </section>
  );
}
