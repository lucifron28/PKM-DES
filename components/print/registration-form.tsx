import { BrandMarks } from "@/components/layout/pkm-mark";
import { PrintButton } from "@/components/print/print-button";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import {
  getAcademicClassificationLabel,
  getRegistrationClassificationMarks,
  getRegistrationTotalUnits,
  REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS,
  REGISTRATION_FORM_SIGNATURE_BLOCKS,
  REGISTRATION_FORM_SUBJECT_ROW_COUNT,
  sortRegistrationSubjects
} from "@/lib/registration-form/presentation";
import { formatDate, formatName } from "@/lib/utils/format";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import type { PresentedEnrollmentSignature } from "@/lib/signatures/presentation";
import type { CourseOffering, Enrollment, EnrollmentClearance, EnrollmentSubject, OfficialStudentRecord, Profile, Student, Subject } from "@/types/database";
import type { RegistrationLoadItem } from "@/lib/registration-form/presentation";

type EnrollmentSubjectRow = Pick<EnrollmentSubject, "id" | "subject_id" | "course_offering_id" | "course_code" | "course_description" | "units"> & {
  subjects?: Subject | null;
  course_offerings?: CourseOffering | null;
};

export type PrintableEnrollment = Omit<Enrollment, "enrollment_clearances" | "enrollment_signatures"> & {
  students?: (Student & { profiles?: Profile | null; official_student_records?: OfficialStudentRecord | null }) | null;
  enrollment_subjects?: EnrollmentSubjectRow[] | null;
  enrollment_clearances?: EnrollmentClearance[] | null;
  enrollment_signatures?: PresentedEnrollmentSignature[] | null;
  health_requirement_applicability?: "APPLICABLE" | "NOT_APPLICABLE" | null;
};

function getRegistrationLoadItem(row: EnrollmentSubjectRow): RegistrationLoadItem | null {
  if (row.course_code.trim() && row.course_description.trim()) {
    return {
      id: row.id,
      course_code: row.course_code,
      course_description: row.course_description,
      units: row.units,
      source: row.course_offering_id ? "course_offering" : "snapshot"
    };
  }

  if (row.course_offerings) {
    return {
      id: row.id,
      course_code: row.course_offerings.course_code,
      course_description: row.course_offerings.course_description,
      units: row.course_offerings.units,
      source: "course_offering"
    };
  }

  if (row.subjects) {
    return {
      id: row.id,
      course_code: row.subjects.course_code,
      course_description: row.subjects.course_description,
      units: row.subjects.units,
      source: "legacy_subject"
    };
  }

  return null;
}

function printableDate(value?: string | null) {
  if (!value) {
    return "Not configured";
  }

  return new Intl.DateTimeFormat("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function printableValue(value?: string | null, fallback = "Not configured") {
  return value?.trim() || fallback;
}

function semesterCode(value: Enrollment["semester"]) {
  return value === "1st Semester" ? "1ST" : "2ND";
}

function FormField({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`registration-print-field ${className}`}>
      <span className="registration-print-field-label">{label}</span>
      <span className="registration-print-field-value">{value}</span>
    </div>
  );
}

function MarkBox({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="registration-print-mark">
      <span className="registration-print-mark-box" aria-label={checked ? `${label}: selected` : `${label}: not selected`}>
        {checked ? "X" : ""}
      </span>
      <span>{label}</span>
    </span>
  );
}

function FeeLine({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`registration-print-fee-line${emphasis ? " registration-print-fee-line-emphasis" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SignatureBlock({
  label,
  signature,
  unsignedLabel = "Pending Signature"
}: {
  label: string;
  signature?: PresentedEnrollmentSignature | null;
  unsignedLabel?: string;
}) {
  const signatureIsCurrent = Boolean(signature?.is_current);

  return (
    <div className="registration-print-signature">
      <div className="registration-print-signature-image">
        {signatureIsCurrent && signature?.signed_url ? (
          <img src={signature.signed_url} alt={`${label} electronic signature`} />
        ) : (
          <span>{signature ? "Signature invalidated" : unsignedLabel}</span>
        )}
      </div>
      <div className="registration-print-signature-line" />
      <div className="registration-print-signature-label">{label}</div>
      {signatureIsCurrent && signature ? (
        <div className="registration-print-signature-meta">
          <span>{signature.signer_name_snapshot}</span>
          <span>Electronically Signed</span>
          <span>{formatDate(signature.signed_at)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function RegistrationForm({ enrollment }: { enrollment: PrintableEnrollment }) {
  const student = enrollment.students;
  const profile = student?.profiles;
  const subjects = sortRegistrationSubjects(
    (enrollment.enrollment_subjects ?? [])
      .map(getRegistrationLoadItem)
      .filter((subject): subject is RegistrationLoadItem => Boolean(subject))
  );
  const totalUnits = getRegistrationTotalUnits(subjects);
  const marks = getRegistrationClassificationMarks(student?.student_type);
  const studentName = formatName(profile?.first_name, profile?.last_name);
  const classification = getAcademicClassificationLabel(student?.student_type);
  const healthApplicability = enrollment.health_requirement_applicability ?? getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: student?.student_type ?? "",
    official_gender_sex: student?.official_student_records?.gender_sex ?? null
  });
  const signatures = new Map((enrollment.enrollment_signatures ?? []).map((signature) => [signature.clearance_type, signature]));
  const subjectRowCount = Math.max(subjects.length, REGISTRATION_FORM_SUBJECT_ROW_COUNT);

  return (
    <div className="space-y-4">
      <section className="print-hidden flex flex-col gap-4 rounded-lg border border-slateui-border bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">PKM-DES Research MVP</p>
          <h2 className="mt-1 text-xl font-bold text-slateui-text">Registration Form Preview</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slateui-muted">
            Live enrollment values are placed into the supplied REGISTRATION FORM 4G paper layout. Unsupported fees, schedules, rooms, and receipt fields remain unconfigured.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
          <PrintButton label="Print Registration Form" />
        </div>
      </section>

      <section className="registration-print print-page mx-auto max-w-[960px] rounded-lg border border-black bg-white p-4 sm:p-6" aria-labelledby="registration-form-title">
        <header className="registration-print-header">
          <div className="registration-print-brand-row">
            <BrandMarks className="registration-print-marks" />
            <div className="registration-print-institution">
              <p>PAMBAYANG KOLEHIYO NG MAUBAN</p>
              <p>Mauban-Atimonan Bypass Road Sitio Looban, Mauban, Quezon 4330</p>
            </div>
            <span className="registration-print-draft-label">DRAFT — NOT OFFICIAL COR</span>
          </div>
          <h1 id="registration-form-title">REGISTRATION FORM</h1>
        </header>

        <section className="registration-print-details" aria-labelledby="registration-student-details">
          <h2 id="registration-student-details" className="sr-only">Student and enrollment details</h2>
          <div className="registration-print-detail-row">
            <FormField label="STUDENT NO:" value={printableValue(student?.student_id_number)} />
            <FormField label="DATE:" value={printableDate(enrollment.submitted_at)} />
          </div>
          <div className="registration-print-detail-row">
            <FormField label="NAME:" value={studentName} />
            <FormField label="YEAR/SECTION:" value={`${enrollment.year_level} / Section not configured`} />
          </div>
          <div className="registration-print-detail-row">
            <FormField label="COURSE:" value={printableValue(enrollment.programs?.name)} />
            <FormField label="SEMESTER/AY:" value={`${semesterCode(enrollment.semester)}/${enrollment.academic_year}`} />
          </div>
          <div className="registration-print-detail-row">
            <FormField label="ADDRESS:" value={printableValue(student?.official_student_records?.address)} />
            <FormField label="STATUS:" value={classification.toUpperCase()} />
          </div>
          <div className="registration-print-classification" aria-label="Student classification">
            <span className="registration-print-classification-label">CLASSIFICATION:</span>
            <MarkBox label="NEW" checked={marks.newStudent} />
            <MarkBox label="OLD" checked={marks.oldStudent} />
            <MarkBox label="TRANSFEREE" checked={marks.transferee} />
            <MarkBox label="REGULAR" checked={marks.regular} />
            <MarkBox label="IRREGULAR" checked={marks.irregular} />
          </div>
        </section>

        <section className="registration-print-subjects" aria-labelledby="registration-subject-load">
          <h2 id="registration-subject-load" className="sr-only">Subject load</h2>
          <div className="print-hidden registration-print-subject-note">
            Time, day, and room are not configured in the current enrollment record and remain TBA.
          </div>
          <div className="registration-print-table-wrap">
            <table className="registration-print-table">
              <colgroup>
                <col className="registration-print-col-code" />
                <col className="registration-print-col-description" />
                <col className="registration-print-col-time" />
                <col className="registration-print-col-day" />
                <col className="registration-print-col-room" />
                <col className="registration-print-col-units" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">SUBJECT CODE</th>
                  <th scope="col">SUBJECT DESCRIPTION</th>
                  <th scope="col">TIME</th>
                  <th scope="col">DAY</th>
                  <th scope="col">ROOM</th>
                  <th scope="col">UNIT</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: subjectRowCount }, (_, index) => {
                  const subject = subjects[index] ?? null;
                  const isEndMarker = !subject && subjects.length > 0 && index === subjects.length;
                  const isEmptyEnrollment = !subject && subjects.length === 0 && index === 0;

                  return (
                    <tr key={subject?.id ?? `blank-subject-${index}`}>
                      <td>{subject?.course_code ?? ""}</td>
                      <td className={isEndMarker ? "registration-print-nothing-follows" : ""}>
                        {subject?.course_description ?? (isEndMarker ? "******nothing follows******" : isEmptyEnrollment ? "No subjects attached to this enrollment." : "")}
                      </td>
                      <td>{subject ? "TBA" : ""}</td>
                      <td>{subject ? "TBA" : ""}</td>
                      <td>{subject ? "TBA" : ""}</td>
                      <td>{subject ? subject.units : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={5}>TOTAL</th>
                  <th>{totalUnits}</th>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="registration-print-warning">Warning: Subject Taken without pre-requisites will not be credited.</p>
        </section>

        <section className="registration-print-assessment" aria-labelledby="registration-assessment">
          <h2 id="registration-assessment">ASSESSMENT OF TUITION AND OTHER SCHOOL FEES (TOSF)</h2>
          <div className="registration-print-assessment-grid">
            <div className="registration-print-misc-fees">
              <h3>MISCELLANEOUS FEE:</h3>
              <table className="registration-print-fee-table">
                <tbody>
                  {REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS.map((label) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>Not configured</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">TOTAL</th>
                    <th>Not configured</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="registration-print-tuition">
              <FeeLine label="TUITION FEE:" value="Not configured" />
              <FeeLine label="NSTP FEE (CWTS):" value="Not configured" />
              <FeeLine label="TOTAL TOSF:" value="Not configured" emphasis />
              <table className="registration-print-payment-table">
                <thead>
                  <tr>
                    <th scope="col">DATE</th>
                    <th scope="col">O.R. NO.</th>
                    <th scope="col">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2, 3].map((row) => (
                    <tr key={row}>
                      <td><span className="sr-only">Not configured</span></td>
                      <td><span className="sr-only">Not configured</span></td>
                      <td><span className="sr-only">Not configured</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="registration-print-scholarship">
              <h3>SCHOLARSHIP:</h3>
              <div className="registration-print-scholarship-line"><span>Not configured</span></div>
            </div>
          </div>
        </section>

        <section className="registration-print-signoff" aria-labelledby="registration-signatures">
          <h2 id="registration-signatures" className="sr-only">Authenticated clearance signatures</h2>
          {REGISTRATION_FORM_SIGNATURE_BLOCKS.filter((block) => block.label !== "Student").map((block) => (
            <SignatureBlock
              key={block.clearanceType}
              label={block.label}
              signature={signatures.get(block.clearanceType)}
              unsignedLabel={block.clearanceType === "HEALTH_CLEARANCE"
                ? healthApplicability === "NOT_APPLICABLE" ? "Not Applicable" : "Pending Nurse Verification"
                : "Pending Signature"}
            />
          ))}
        </section>

        <section className="registration-print-privacy" aria-label="Privacy authorization">
          <p className="registration-print-privacy-copy">
            I hereby authorize the Pambayang Kolehiyo ng Mauban to collect, process, store and utilize my personal data for the management of my academic records and related administrative purposes. This includes, but is not limited to, the use of my data for instructional purposes, research, data and system improvements.
          </p>
          <div className="registration-print-privacy-footer">
            <div className="registration-print-copy-label">STUDENT&apos;S COPY</div>
            <div className="registration-print-privacy-signature">
              <SignatureBlock label="Student" signature={signatures.get("STUDENT_ENROLLMENT_SIGNATURE")} />
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
