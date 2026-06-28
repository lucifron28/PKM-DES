import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { OfficialStudentRecord } from "@/types/database";

function displayValue(value?: string | null) {
  return value?.trim() || "Not provided";
}

function formatBirthdate(value?: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

async function getMatchingOfficialRecord({
  email,
  studentIdNumber
}: {
  email: string;
  studentIdNumber: string | null;
}) {
  let admin;

  try {
    admin = createSupabaseAdminClient();
  } catch {
    return null;
  }

  const { data: emailMatch } = await admin
    .from("official_student_records")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (emailMatch) {
    return emailMatch as OfficialStudentRecord;
  }

  if (!studentIdNumber) {
    return null;
  }

  const { data: studentIdMatch } = await admin
    .from("official_student_records")
    .select("*")
    .eq("student_id_number", studentIdNumber)
    .maybeSingle();

  return (studentIdMatch as OfficialStudentRecord | null) ?? null;
}

function DetailList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[220px_1fr]">
          <dt className="font-medium text-slateui-muted">{label}</dt>
          <dd className="font-semibold text-slateui-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function StudentAccountPage() {
  const { profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  if (!student) {
    return <EmptyState title="Student record not found." description="Please contact an administrator." />;
  }

  const officialRecord = await getMatchingOfficialRecord({
    email: profile.email,
    studentIdNumber: student.student_id_number
  });
  const accountRows: Array<[string, string]> = [
    ["Student ID Number", student.student_id_number ?? "Not provided"],
    ["First Name", profile.first_name],
    ["Last Name", profile.last_name],
    ["Active Email Address", profile.email],
    ["Program", student.programs?.name ?? "Not available"],
    ["Year Level", student.year_level],
    ["Student Type", student.student_type],
    ["Enrollment Status", student.enrollment_status]
  ];
  const officialRows: Array<[string, string]> = officialRecord
    ? [
        ["Birthdate", formatBirthdate(officialRecord.birthdate)],
        ["Gender/Sex", displayValue(officialRecord.gender_sex)],
        ["Address", displayValue(officialRecord.address)],
        ["Contact Number", displayValue(officialRecord.contact_number)],
        ["Guardian", displayValue(officialRecord.guardian)],
        ["Emergency Contact Person", displayValue(officialRecord.emergency_contact_person)],
        ["Nationality", displayValue(officialRecord.nationality)],
        ["Civil Status", displayValue(officialRecord.civil_status)],
        ["Previous School Information", displayValue(officialRecord.previous_school_information)],
        ["Admission Status", displayValue(officialRecord.admission_status)]
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Account" description="Displayed student profile details." />
        <DetailList rows={accountRows} />
        <div className="mt-6">
          <Button type="button" variant="outline" disabled>
            Edit Profile
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Account Security"
          description="Change your password while signed in."
        />
        <ChangePasswordForm />
      </Card>

      <Card>
        <CardHeader
          title="Official Student Details"
          description="Registrar-managed details shown when an official record matches your account."
        />
        {officialRecord ? (
          <DetailList rows={officialRows} />
        ) : (
          <EmptyState
            title="No matching official details found."
            description="Core account details remain available. Please contact the Registrar if your official profile details should be updated."
          />
        )}
      </Card>
    </div>
  );
}
