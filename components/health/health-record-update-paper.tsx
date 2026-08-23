import { PkmMark } from "@/components/layout/pkm-mark";
import { PrintButton } from "@/components/print/print-button";
import { formatDate } from "@/lib/utils/format";
import type { HealthRecordUpdate } from "@/lib/health-records/types";

type SignatureDisplay = {
  signerName: string;
  signedAt: string;
  signedUrl?: string | null;
} | null;

type HealthRecordUpdatePaperProps = {
  studentName: string;
  program: string;
  yearLevel: string;
  dateLabel: string;
  record: HealthRecordUpdate | null;
  editable?: boolean;
  studentSignature?: SignatureDisplay;
  nurseSignature?: SignatureDisplay;
};

const controlClassName = "health-record-paper-control w-full bg-transparent px-1 py-0.5 text-center text-[0.78rem] outline-none";

function formatDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}
function PaperValue({ value, date = false }: { value?: string | null; date?: boolean }) {
  return <span className="health-record-paper-value">{date ? formatDateInput(value) : value || ""}</span>;
}

function PaperInput({
  name,
  value,
  type = "text",
  label
}: {
  name: string;
  value?: string | null;
  type?: "text" | "date";
  label: string;
}) {
  return (
    <input
      name={name}
      type={type}
      defaultValue={type === "date" ? formatDateInput(value) : value ?? ""}
      maxLength={type === "text" ? 240 : undefined}
      aria-label={label}
      className={controlClassName}
    />
  );
}

function PaperCell({
  name,
  value,
  type = "text",
  label,
  editable
}: {
  name: string;
  value?: string | null;
  type?: "text" | "date";
  label: string;
  editable: boolean;
}) {
  return editable ? <PaperInput name={name} value={value} type={type} label={label} /> : <PaperValue value={value} date={type === "date"} />;
}

export function HealthRecordUpdatePaper({
  studentName,
  program,
  yearLevel,
  dateLabel,
  record,
  editable = false,
  studentSignature,
  nurseSignature
}: HealthRecordUpdatePaperProps) {
  return (
    <section className="health-record-paper print-page" aria-labelledby="health-record-paper-title">
      <header className="health-record-paper-header">
        <div className="health-record-paper-mark" aria-hidden="true"><PkmMark /></div>
        <div className="health-record-paper-heading">
          <p className="health-record-paper-school">PAMBAYANG KOLEHIYO NG MAUBAN</p>
          <p className="health-record-paper-service">HEALTH SERVICES</p>
          <h2 id="health-record-paper-title">HEALTH RECORD UPDATE</h2>
        </div>
        <PrintButton label="Print Health Record Update" />
      </header>

      <div className="health-record-paper-identification">
        <div className="health-record-paper-identification-column">
          <p><strong>Date:</strong> <span>{dateLabel}</span></p>
          <p><strong>Name:</strong> <span>{studentName}</span></p>
          <p><strong>Program:</strong> <span>{program}</span></p>
        </div>
        <p className="health-record-paper-year"><strong>Year &amp; Section:</strong> <span>{yearLevel}</span></p>
      </div>

      <div className="health-record-paper-section-label">PAST OR CURRENT MEDICAL CONDITIONS</div>
      <table className="health-record-paper-table">
        <thead>
          <tr>
            <th>Medical Condition</th>
            <th>When identified</th>
            <th>Medications (If Any)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><PaperCell name="medical_condition_1" value={record?.medical_condition_1} label="Medical condition 1" editable={editable} /></td>
            <td><PaperCell name="medical_condition_1_identified_on" value={record?.medical_condition_1_identified_on} type="date" label="When medical condition 1 was identified" editable={editable} /></td>
            <td><PaperCell name="medical_condition_1_medication" value={record?.medical_condition_1_medication} label="Medication for medical condition 1" editable={editable} /></td>
          </tr>
          <tr>
            <td><PaperCell name="medical_condition_2" value={record?.medical_condition_2} label="Medical condition 2" editable={editable} /></td>
            <td><PaperCell name="medical_condition_2_identified_on" value={record?.medical_condition_2_identified_on} type="date" label="When medical condition 2 was identified" editable={editable} /></td>
            <td><PaperCell name="medical_condition_2_medication" value={record?.medical_condition_2_medication} label="Medication for medical condition 2" editable={editable} /></td>
          </tr>
          <tr>
            <td><div className="health-record-paper-labeled-cell"><strong>Allergy:</strong><PaperCell name="allergy" value={record?.allergy} label="Allergy" editable={editable} /></div></td>
            <td><PaperValue value="" /></td>
            <td><PaperValue value="" /></td>
          </tr>
        </tbody>
      </table>

      <div className="health-record-paper-female-line">
        <div>
          <strong>For Females: Last Menstrual Period</strong>
          <em>(Unang araw ng huling regla)</em>
        </div>
        <div className="health-record-paper-underline">
          {editable ? <PaperInput name="last_menstrual_period" value={record?.last_menstrual_period} type="date" label="Last menstrual period" /> : <PaperValue value={record?.last_menstrual_period} date />}
        </div>
      </div>

      <div className="health-record-paper-others-line">
        <strong>Others</strong>
        <div className="health-record-paper-underline">
          {editable ? <PaperInput name="others" value={record?.others} label="Other health information" /> : <PaperValue value={record?.others} />}
        </div>
      </div>

      <div className="health-record-paper-signature-row">
        <div className="health-record-paper-student-signature">
          <div className="health-record-paper-signature-line">
            {studentSignature?.signedUrl ? <img src={studentSignature.signedUrl} alt="Student electronic signature" /> : null}
          </div>
          <span>Student&apos;s Signature</span>
          {studentSignature ? <small>{studentSignature.signerName} · {formatDate(studentSignature.signedAt)}</small> : null}
        </div>
        <div className="health-record-paper-service-box">
          <strong>PKM Health Services</strong>
          {nurseSignature?.signedUrl ? <img src={nurseSignature.signedUrl} alt="School Nurse electronic signature" /> : null}
          {nurseSignature ? <small>Verified by {nurseSignature.signerName}<br />{formatDate(nurseSignature.signedAt)}</small> : null}
        </div>
      </div>
    </section>
  );
}
