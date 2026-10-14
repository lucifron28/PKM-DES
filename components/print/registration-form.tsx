import React from "react";
import { MaubanMark, PkmMark } from "@/components/layout/pkm-mark";
import { PrintButton } from "@/components/print/print-button";
import { RegistrationPolicy } from "@/components/print/registration-policy";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import {
  getRegistrationClassificationMarks,
  getRegistrationTotalUnits,
  REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS,
  REGISTRATION_FORM_SUBJECT_ROW_COUNT,
  sortRegistrationSubjects
} from "@/lib/registration-form/presentation";
import { formatRegistrationAmount, formatRegistrationReceiptDate, presentRegistrationFinance } from "@/lib/registration-form/finance";
import { formatDate, formatName } from "@/lib/utils/format";
import { getRequirementApplicability } from "@/lib/requirements/rules";
import type { PresentedEnrollmentSignature } from "@/lib/signatures/presentation";
import type { CourseOffering, Enrollment, EnrollmentClearance, EnrollmentSubject, OfficialStudentRecord, Profile, Student, Subject } from "@/types/database";
import type { RegistrationLoadItem } from "@/lib/registration-form/presentation";
import type { PrintableRegistrationFinancialSummary } from "@/lib/registration-form/finance";

type EnrollmentSubjectRow = Pick<EnrollmentSubject, "id" | "subject_id" | "course_offering_id" | "course_code" | "course_description" | "units"> & {
  day?: string | null;
  time?: string | null;
  room?: string | null;
  subjects?: Subject | null;
  course_offerings?: CourseOffering | null;
};

export type PrintableEnrollment = Omit<Enrollment, "enrollment_clearances" | "enrollment_signatures" | "financial_summary" | "registrar_approval"> & {
  students?: (Student & { profiles?: Profile | null; official_student_records?: OfficialStudentRecord | null }) | null;
  enrollment_subjects?: EnrollmentSubjectRow[] | null;
  enrollment_clearances?: EnrollmentClearance[] | null;
  enrollment_signatures?: PresentedEnrollmentSignature[] | null;
  financial_summary?: PrintableRegistrationFinancialSummary | null;
  registrar_approval?: { name: string; approved_at: string } | null;
  health_requirement_applicability?: "APPLICABLE" | "NOT_APPLICABLE" | null;
};

export type RegistrationFormProps = {
  enrollment: PrintableEnrollment;
  studentPledgeCovered?: boolean;
  registrationPledgeVersion?: string | null;
};

const REGISTRATION_FORM_COPIES = [
  { recipient: "student", label: "STUDENT'S COPY" },
  { recipient: "dean", label: "DEAN'S COPY" },
  { recipient: "registrar", label: "REGISTRAR'S COPY" },
  { recipient: "accountant", label: "ACCOUNTANT'S COPY" }
] as const;

function getRegistrationLoadItem(row: EnrollmentSubjectRow): RegistrationLoadItem | null {
  const scheduleSnapshots = { day: row.day, time: row.time, room: row.room };

  if (row.course_code.trim() && row.course_description.trim()) {
    return {
      id: row.id,
      course_code: row.course_code,
      course_description: row.course_description,
      units: row.units,
      ...scheduleSnapshots,
      source: row.course_offering_id ? "course_offering" : "snapshot"
    };
  }

  if (row.course_offerings) {
    return {
      id: row.id,
      course_code: row.course_offerings.course_code,
      course_description: row.course_offerings.course_description,
      units: row.course_offerings.units,
      ...scheduleSnapshots,
      source: "course_offering"
    };
  }

  if (row.subjects) {
    return {
      id: row.id,
      course_code: row.subjects.course_code,
      course_description: row.subjects.course_description,
      units: row.subjects.units,
      ...scheduleSnapshots,
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
    year: "numeric",
    timeZone: "Asia/Manila"
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

function RegistrationPaymentSummary({ finance }: { finance: ReturnType<typeof presentRegistrationFinance> }) {
  return (
    <div
      className="registration-print-finance-summary"
      aria-label="Assessment and payment summary"
      data-assessment-version={finance.assessmentVersion ?? undefined}
    >
      <span>STATUS: {finance.paymentStatus ?? "Not configured"}</span>
      <span>PAID: {formatRegistrationAmount(finance.paidAmount, finance.currencyCode)} | BALANCE DUE: {formatRegistrationAmount(finance.balanceDue, finance.currencyCode)}</span>
    </div>
  );
}

function RegistrarApprovalBlock({ approval }: { approval: PrintableEnrollment["registrar_approval"] }) {
  return (
    <div className="registration-print-signature registration-print-signature-registrar">
      <div className="registration-print-signature-image" aria-hidden="true" />
      <div className={`registration-print-signature-name${approval ? "" : " registration-print-signature-name-spacer"}`}>
        {approval?.name ?? "\u00a0"}
      </div>
      <div className="registration-print-signature-line" />
      <div className="registration-print-signature-label">Registrar</div>
      {approval ? (
        <div className="registration-print-signature-meta print-hidden">
          <span>Approved — {formatDate(approval.approved_at)}</span>
        </div>
      ) : null}
    </div>
  );
}

function SignatureBlock({
  label,
  signature,
  unsignedLabel = "Pending Signature",
  className = ""
}: {
  label: string;
  signature?: PresentedEnrollmentSignature | null;
  unsignedLabel?: string;
  className?: string;
}) {
  const signatureIsCurrent = Boolean(signature?.is_current);

  return (
    <div className={`registration-print-signature ${className}`}>
      <div className="registration-print-signature-image">
        {signatureIsCurrent && signature?.signed_url ? (
          <img src={signature.signed_url} alt={`${label} electronic signature`} />
        ) : (
          <span className="print-hidden">{signature ? "Signature invalidated" : unsignedLabel}</span>
        )}
      </div>
      <div className={`registration-print-signature-name${signatureIsCurrent && signature ? "" : " registration-print-signature-name-spacer"}`}>
        {signatureIsCurrent && signature ? signature.signer_name_snapshot : "\u00a0"}
      </div>
      <div className="registration-print-signature-line" />
      <div className="registration-print-signature-label">{label}</div>
      {signatureIsCurrent && signature ? (
        <div className="registration-print-signature-meta print-hidden">
          <span>Electronically Signed — {formatDate(signature.signed_at)}</span>
        </div>
      ) : null}
    </div>
  );
}

export function RegistrationForm({
  enrollment,
  studentPledgeCovered = false,
  registrationPledgeVersion = null
}: RegistrationFormProps) {
  const student = enrollment.students;
  const profile = student?.profiles;
  const subjects = sortRegistrationSubjects(
    (enrollment.enrollment_subjects ?? [])
      .map(getRegistrationLoadItem)
      .filter((subject): subject is RegistrationLoadItem => Boolean(subject))
  );
  const totalUnits = getRegistrationTotalUnits(subjects);
  const marks = getRegistrationClassificationMarks(student?.student_type);
  const finance = presentRegistrationFinance(enrollment.financial_summary);
  const studentName = formatName(profile?.first_name, profile?.last_name);
  const yearNumber = enrollment.year_level.match(/\d+/)?.[0] ?? enrollment.year_level;
  const yearSection = enrollment.programs?.code ? `${enrollment.programs.code} ${yearNumber}` : enrollment.year_level;
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
            Live enrollment values are placed into the supplied REGISTRATION FORM 4G paper layout. Missing schedules remain TBA; receipt rows stay blank until ledger details are loaded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={enrollmentBadgeTone(enrollment.status)}>{enrollment.status}</Badge>
          <PrintButton label="Print Registration Form" />
        </div>
      </section>

      {REGISTRATION_FORM_COPIES.map((copy) => (
        <section
          key={copy.recipient}
          className="registration-print print-page mx-auto max-w-[960px] rounded-lg border border-black bg-white p-4 sm:p-6"
          aria-labelledby={`registration-form-title-${copy.recipient}`}
          data-copy-recipient={copy.recipient}
        >
          <div className="registration-print-watermark" aria-hidden="true" data-testid="registration-print-watermark">
            {/* eslint-disable-next-line @next/next/no-img-element -- Direct image printing does not depend on browser background-graphics settings. */}
            <img src="/brand/pkm-registration-watermark.png" alt="" draggable={false} />
          </div>
          <header className="registration-print-header">
            <div className="registration-print-brand-row">
              <PkmMark />
              <div className="registration-print-institution">
                <p>PAMBAYANG KOLEHIYO NG MAUBAN</p>
                <p>Mauban-Atimonan Bypass Road Sitio Looban, Mauban, Quezon 4330</p>
              </div>
              <MaubanMark />
            </div>
          </header>

          <section className="registration-print-details" aria-labelledby={`registration-student-details-${copy.recipient}`}>
            <h2 id={`registration-student-details-${copy.recipient}`} className="sr-only">Student and enrollment details</h2>
            <div className="registration-print-details-column registration-print-details-primary">
              <FormField label="STUDENT NO:" value={printableValue(student?.student_id_number)} />
              <FormField label="NAME:" value={studentName} />
              <FormField label="COURSE:" value={printableValue(enrollment.programs?.name)} />
              <FormField label="ADDRESS:" value={printableValue(student?.official_student_records?.address)} />
              <div className="registration-print-classification" aria-label="Student classification">
                <span className="registration-print-classification-label">CLASSIFICATION:</span>
                <MarkBox label="NEW" checked={marks.newStudent} />
                <MarkBox label="OLD" checked={marks.oldStudent} />
                <MarkBox label="TRANSFEREE" checked={marks.transferee} />
              </div>
            </div>

            <div className="registration-print-details-column registration-print-details-secondary">
              <FormField label="DATE:" value={printableDate(enrollment.submitted_at)} />
              <FormField label="YEAR/SECTION:" value={yearSection} />
              <FormField label="SEMESTER/AY:" value={`${semesterCode(enrollment.semester)}/${enrollment.academic_year}`} />
              <div className="registration-print-status" aria-label="Academic status">
                <span className="registration-print-field-label">STATUS:</span>
                <span className="registration-print-status-marks">
                  <MarkBox label="REGULAR" checked={marks.regular} />
                  <MarkBox label="IRREGULAR" checked={marks.irregular} />
                </span>
              </div>
            </div>
          </section>

          <h1 id={`registration-form-title-${copy.recipient}`} className="registration-print-title">REGISTRATION FORM</h1>

          <section className="registration-print-subjects" aria-labelledby={`registration-subject-load-${copy.recipient}`}>
            <h2 id={`registration-subject-load-${copy.recipient}`} className="sr-only">Subject load</h2>
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
                        <td>{subject ? printableValue(subject.time, "TBA") : ""}</td>
                        <td>{subject ? printableValue(subject.day, "TBA") : ""}</td>
                        <td>{subject ? printableValue(subject.room, "TBA") : ""}</td>
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

          <section className="registration-print-assessment" aria-labelledby={`registration-assessment-${copy.recipient}`}>
            <h2 id={`registration-assessment-${copy.recipient}`}>ASSESSMENT OF TUITION AND OTHER SCHOOL FEES (TOSF)</h2>
            <div className="registration-print-assessment-grid">
              <div className="registration-print-misc-fees">
                <h3>MISCELLANEOUS FEE:</h3>
                <table className="registration-print-fee-table">
                  <tbody>
                    {REGISTRATION_FORM_MISCELLANEOUS_FEE_LABELS.map((label) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{formatRegistrationAmount(finance.miscellaneousAmounts[label], finance.currencyCode)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">TOTAL</th>
                    <th>{formatRegistrationAmount(finance.miscellaneousTotal, finance.currencyCode)}</th>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="registration-print-tuition">
              <FeeLine label="TUITION FEE:" value={formatRegistrationAmount(finance.tuitionAmount, finance.currencyCode)} />
              <FeeLine label="NSTP FEE (CWTS):" value={formatRegistrationAmount(finance.nstpAmount, finance.currencyCode)} />
              <FeeLine label="TOTAL TOSF:" value={formatRegistrationAmount(finance.assessedAmount, finance.currencyCode)} emphasis />
              <RegistrationPaymentSummary finance={finance} />
              <table className="registration-print-payment-table">
                <thead>
                  <tr>
                    <th scope="col">DATE</th>
                    <th scope="col">O.R. NO.</th>
                    <th scope="col">AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }, (_, index) => {
                    const receipt = finance.paymentReceipts[index];
                    return (
                    <tr key={receipt?.payment_id ?? `empty-receipt-${index}`}>
                      <td>{receipt ? formatRegistrationReceiptDate(receipt.paid_at) : ""}</td>
                      <td>{receipt?.reference ?? ""}</td>
                      <td>{receipt ? formatRegistrationAmount(receipt.amount, finance.currencyCode) : ""}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {finance.unprintedReceiptCount > 0 ? (
                <p className="registration-print-receipt-overflow print-hidden" role="note">
                  Showing the {finance.paymentReceipts.length} latest of {finance.paymentReceipts.length + finance.unprintedReceiptCount} receipts. {finance.unprintedReceiptCount} earlier receipts are not shown in this form; the paid total includes all receipts.
                </p>
              ) : null}

            </div>

            <div className="registration-print-approvals">
              <div className="registration-print-scholarship">
                <h3>SCHOLARSHIP:</h3>
                <div className="registration-print-scholarship-line">
                  <span>{formatRegistrationAmount(finance.scholarshipAmount, finance.currencyCode)}</span>
                </div>
              </div>
            </div>

            <div className="registration-print-signatures" aria-label="Enrollment signatures">
              <SignatureBlock
                label="ACTING MUNICIPAL ACCOUNTANT"
                signature={signatures.get("ACCOUNTING_CLEARANCE")}
                className="registration-print-signature-accountant"
              />
              <SignatureBlock
                label="Librarian"
                signature={signatures.get("LIBRARY_CLEARANCE")}
                className="registration-print-signature-librarian"
              />
              <SignatureBlock
                label="NURSE"
                signature={signatures.get("HEALTH_CLEARANCE")}
                unsignedLabel={healthApplicability === "NOT_APPLICABLE" ? "Not Applicable" : "Pending Nurse Verification"}
                className="registration-print-signature-nurse"
              />
              <SignatureBlock
                label="Dean"
                signature={signatures.get("DEAN_CLEARANCE")}
                className="registration-print-signature-dean"
              />
              <RegistrarApprovalBlock approval={enrollment.registrar_approval} />
              <SignatureBlock
                label="Program Chair"
                signature={signatures.get("PROGRAM_CLEARANCE")}
                className="registration-print-signature-program-chair"
              />
            </div>
          </div>
        </section>

        <div className="registration-print-bottom">
          <div className="registration-print-copy-label">{copy.label}</div>
          <section className="registration-print-privacy" aria-label="Privacy authorization">
            <p className="registration-print-privacy-copy">
              I hereby authorize the Pambayang Kolehiyo ng Mauban to collect, process, store and utilize my personal data for the management of my academic records and related administrative purposes. This includes, but is not limited to, the use of my data for instructional purposes, research, data and system improvements.
            </p>
            <div className="registration-print-privacy-signature">
                <SignatureBlock
                  label="Signature over printed name of the student"
                  signature={signatures.get("STUDENT_ENROLLMENT_SIGNATURE")}
                />
            </div>
          </section>
        </div>
      </section>
      ))}

      <RegistrationPolicy
        studentPledgeCovered={studentPledgeCovered}
        registrationPledgeVersion={registrationPledgeVersion}
        studentSignature={signatures.get("STUDENT_ENROLLMENT_SIGNATURE")}
      />
    </div>
  );
}
