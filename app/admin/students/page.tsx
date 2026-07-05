import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink, buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextInput } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleTable } from "@/components/tables/simple-table";
import { OfficialStudentRecordForm } from "./official-record-form";
import { addOfficialStudentRecordAction } from "./actions";
import { requireRole } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { STUDENT_TYPE_TAGS, YEAR_LEVELS, OFFICIAL_RECORD_ERROR_MESSAGES } from "@/lib/constants/pkm";
import { formatDate, formatName } from "@/lib/utils/format";
import type { AccountStatus, EnrollmentStatus, OfficialStudentRecord, Profile, Program, Student, StudentType, YearLevel } from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];

type OfficialStudentRecordRow = OfficialStudentRecord & {
  programs?: Program | null;
};

type StudentAccountRow = Student & {
  profiles?: Pick<Profile, "id" | "email" | "account_status"> | null;
};

type ProfileAccountRow = Pick<Profile, "id" | "email" | "account_status">;

type AccountMatch = {
  status: AccountStatus | null;
  matchedBy: "email" | "student_id" | null;
};

function normalizeLookup(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getPreferredAccountStatus(matches: Array<{ account_status: AccountStatus | null }>) {
  const activeMatch = matches.find((match) => match.account_status === "ACTIVE");
  const match = activeMatch ?? matches[0];

  return match?.account_status ?? null;
}

function accountBadgeTone(status: AccountStatus | null) {
  if (status === "ACTIVE") {
    return "success";
  }

  if (status === "PENDING") {
    return "warning";
  }

  return "neutral";
}

export default async function StudentRecordsPage({
  searchParams
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    q?: string;
    program_id?: string;
    year_level?: string;
    student_type?: string;
    enrollment_status?: string;
    page?: string;
  }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const { data: programsData } = await supabase.from("programs").select("*").order("name");
  const programs = (programsData as Program[] | null) ?? [];
  const selectedProgramId = programs.some((program) => program.id === params.program_id) ? params.program_id : "";
  const selectedYearLevel = YEAR_LEVELS.includes(params.year_level as YearLevel) ? params.year_level : "";
  const selectedStudentType = STUDENT_TYPE_TAGS.includes(params.student_type as StudentType) ? params.student_type : "";
  const selectedEnrollmentStatus = ENROLLMENT_STATUSES.includes(params.enrollment_status as EnrollmentStatus)
    ? params.enrollment_status
    : "";

  const searchTerm = String(params.q ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(params.page ?? 1));
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let recordsQuery = supabase
    .from("official_student_records")
    .select("*, programs(*)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (selectedProgramId) {
    recordsQuery = recordsQuery.eq("program_id", selectedProgramId);
  }

  if (selectedYearLevel) {
    recordsQuery = recordsQuery.eq("year_level", selectedYearLevel);
  }

  if (selectedStudentType) {
    recordsQuery = recordsQuery.eq("student_type", selectedStudentType);
  }

  if (selectedEnrollmentStatus) {
    recordsQuery = recordsQuery.eq("enrollment_status", selectedEnrollmentStatus);
  }

  if (searchTerm) {
    recordsQuery = recordsQuery.or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,student_id_number.ilike.%${searchTerm}%`
    );
  }

  const { data: recordsData, count } = await recordsQuery;
  const totalCount = count ?? 0;
  const records = (recordsData as OfficialStudentRecordRow[] | null) ?? [];
  const recordEmails = [...new Set(records.map((record) => normalizeLookup(record.email)).filter(Boolean))];
  const recordStudentIds = [
    ...new Set(records.map((record) => normalizeLookup(record.student_id_number)).filter(Boolean))
  ];
  const [{ data: accountMatchesByEmailData }, { data: accountMatchesByStudentIdData }] = await Promise.all([
    recordEmails.length
      ? supabase
          .from("profiles")
          .select("id, email, account_status")
          .eq("role", "student")
          .in("email", recordEmails)
      : Promise.resolve({ data: [] }),
    recordStudentIds.length
      ? supabase
          .from("students")
          .select("id, student_id_number, profiles(id, email, account_status)")
          .in("student_id_number", recordStudentIds)
      : Promise.resolve({ data: [] })
  ]);
  const accountMatchesByEmail = ((accountMatchesByEmailData as ProfileAccountRow[] | null) ?? []).filter(
    (match) => match.email
  );
  const accountMatchesByStudentId = ((accountMatchesByStudentIdData as StudentAccountRow[] | null) ?? []).filter(
    (match) => match.student_id_number
  );
  const accountMatchByRecordId = new Map<string, AccountMatch>();

  records.forEach((record) => {
    const emailMatches = accountMatchesByEmail.filter(
      (match) => normalizeLookup(match.email) === normalizeLookup(record.email)
    );

    if (emailMatches.length) {
      accountMatchByRecordId.set(record.id, {
        status: getPreferredAccountStatus(emailMatches),
        matchedBy: "email"
      });
      return;
    }

    const studentIdMatches = accountMatchesByStudentId.filter(
      (match) => normalizeLookup(match.student_id_number) === normalizeLookup(record.student_id_number)
    );

    if (studentIdMatches.length) {
      accountMatchByRecordId.set(record.id, {
        status: getPreferredAccountStatus(
          studentIdMatches.map((match) => ({ account_status: match.profiles?.account_status ?? null }))
        ),
        matchedBy: "student_id"
      });
    }
  });
  const matchedAccountCount = records.filter((record) => accountMatchByRecordId.has(record.id)).length;
  const activeAccountCount = records.filter(
    (record) => accountMatchByRecordId.get(record.id)?.status === "ACTIVE"
  ).length;
  const unmatchedRecordCount = records.length - matchedAccountCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Official Student Records"
          description="Registrar-managed records used as the future source for account matching."
        />
        {params.created ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <p className="font-semibold">Official student record saved.</p>
            <p className="mt-1">
              Next step: the student must claim this record, log in, and submit Online Enrollment before they appear in Pending Enrollments, Masterlist, or dashboard counts.
            </p>
          </div>
        ) : null}
        {params.updated ? (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            <p className="font-semibold">Official student record updated.</p>
            <p className="mt-1">
              Updates here do not create enrollment records. The student still needs to submit Online Enrollment for Registrar review.
            </p>
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {OFFICIAL_RECORD_ERROR_MESSAGES[params.error] ?? "Official student record could not be saved."}
          </div>
        ) : null}
        <OfficialStudentRecordForm action={addOfficialStudentRecordAction} programs={programs} submitLabel="Save Official Record" />
      </Card>

      <Card>
        <CardHeader
          title="Official Records"
          description="Search, filter, and edit Registrar-managed records used for account matching."
        />
        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <StatCard label="Displayed records" value={records.length} helper="After current filters" />
          <StatCard label="Matched accounts" value={matchedAccountCount} helper={`${activeAccountCount} active`} tone="success" />
          <StatCard label="Needs account" value={unmatchedRecordCount} helper="No matching student account found" tone="warning" />
        </div>
        <form className="mb-5 grid gap-4 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto_auto] lg:items-end">
          <TextInput label="Search" name="q" placeholder="Name, email, or Student ID" defaultValue={params.q ?? ""} />
          <SelectInput label="Program" name="program_id" defaultValue={selectedProgramId}>
            <option value="">All programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" defaultValue={selectedYearLevel}>
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Classification" name="student_type" defaultValue={selectedStudentType}>
            <option value="">All types</option>
            {STUDENT_TYPE_TAGS.map((studentType) => (
              <option key={studentType} value={studentType}>{studentType}</option>
            ))}
          </SelectInput>
          <SelectInput label="Enrollment" name="enrollment_status" defaultValue={selectedEnrollmentStatus}>
            <option value="">All statuses</option>
            {ENROLLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </SelectInput>
          <Button type="submit">Apply</Button>
          <ButtonLink href="/admin/students" variant="outline">Reset</ButtonLink>
        </form>
        {records.length ? (
          <>
            <SimpleTable
              columns={["Student name", "Student ID", "Email", "Program", "Year Level", "Type", "Enrollment", "Account", "Updated", "Action"]}
              rows={records.map((record) => {
                const accountMatch = accountMatchByRecordId.get(record.id) ?? {
                  status: null,
                  matchedBy: null
                };
                const accountLabel = accountMatch.status
                  ? `${accountMatch.status} account`
                  : "No account";
                const accountMatchLabel =
                  accountMatch.matchedBy === "student_id" ? "Student ID" : "Email";

                return [
                  formatName(record.first_name, record.last_name),
                  record.student_id_number ?? "Not provided",
                  record.email,
                  record.programs?.name ?? "Not available",
                  record.year_level,
                  record.student_type,
                  <Badge key={`${record.id}-enrollment`} tone={enrollmentBadgeTone(record.enrollment_status)}>
                    {record.enrollment_status}
                  </Badge>,
                  <span key={`${record.id}-account`} className="inline-flex flex-col gap-1">
                    <Badge tone={accountBadgeTone(accountMatch.status)}>{accountLabel}</Badge>
                    {accountMatch.matchedBy ? (
                      <span className="text-xs text-slateui-muted">Matched by {accountMatchLabel}</span>
                    ) : null}
                  </span>,
                  formatDate(record.updated_at),
                  <ButtonLink
                    key={`${record.id}-edit`}
                    href={`/admin/students/${record.id}/edit`}
                    variant="outline"
                    className="min-h-9 px-3 py-1.5"
                  >
                    Edit
                  </ButtonLink>
                ];
              })}
            />
            {(() => {
              const totalPages = Math.ceil(totalCount / pageSize);
              if (totalPages <= 1) return null;

              const buildPageUrl = (targetPage: number) => {
                const queryParams = new URLSearchParams();
                if (params.q) queryParams.set("q", params.q);
                if (params.program_id) queryParams.set("program_id", params.program_id);
                if (params.year_level) queryParams.set("year_level", params.year_level);
                if (params.student_type) queryParams.set("student_type", params.student_type);
                if (params.enrollment_status) queryParams.set("enrollment_status", params.enrollment_status);
                queryParams.set("page", String(targetPage));
                return `/admin/students?${queryParams.toString()}`;
              };

              return (
                <div className="mt-5 flex items-center justify-between border-t border-slateui-border pt-4">
                  <div className="text-sm text-slateui-muted">
                    Showing <span className="font-semibold">{from + 1}</span> to{" "}
                    <span className="font-semibold">{Math.min(to + 1, totalCount)}</span> of{" "}
                    <span className="font-semibold">{totalCount}</span> records
                  </div>
                  <div className="flex gap-2">
                    {page <= 1 ? (
                      <span className={cn(buttonClassName("outline"), "cursor-not-allowed opacity-60 min-h-9 px-3 py-1.5 text-sm")}>
                        Previous
                      </span>
                    ) : (
                      <ButtonLink href={buildPageUrl(page - 1)} variant="outline" className="min-h-9 px-3 py-1.5 text-sm">
                        Previous
                      </ButtonLink>
                    )}
                    {page >= totalPages ? (
                      <span className={cn(buttonClassName("outline"), "cursor-not-allowed opacity-60 min-h-9 px-3 py-1.5 text-sm")}>
                        Next
                      </span>
                    ) : (
                      <ButtonLink href={buildPageUrl(page + 1)} variant="outline" className="min-h-9 px-3 py-1.5 text-sm">
                        Next
                      </ButtonLink>
                    )}
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <EmptyState
            title="No official student records found."
            description="Official Student Records are Registrar source records for account claiming. They become Pending Enrollments only after the student claims an account and submits Online Enrollment."
          />
        )}
      </Card>
    </div>
  );
}
