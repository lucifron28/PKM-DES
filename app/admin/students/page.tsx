import { redirect } from "next/navigation";
import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button, ButtonLink, buttonClassName } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput, TextInput } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { SimpleTable } from "@/components/tables/simple-table";
import { addOfficialStudentRecordAction } from "./actions";
import { OfficialStudentRecordForm } from "./official-record-form";
import { requireRole } from "@/lib/auth/session";
import {
  ACCOUNT_MATCH_LABELS,
  buildOfficialRecordSearchFilter,
  normalizeOfficialRecordEmail,
  normalizeOfficialRecordSearch,
  normalizeOfficialRecordStudentId,
  parsePositivePage,
  resolveOfficialRecordAccountMatch,
  type AccountMatchCandidate,
  type OfficialRecordAccountMatch
} from "@/lib/admin-student-records/record-management";
import { OFFICIAL_RECORD_ERROR_MESSAGES, STUDENT_TYPE_TAGS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatName } from "@/lib/utils/format";
import type {
  AccountStatus,
  EnrollmentStatus,
  OfficialStudentRecord,
  Profile,
  Program,
  Student,
  StudentType,
  YearLevel
} from "@/types/database";

const ENROLLMENT_STATUSES: EnrollmentStatus[] = ["NOT ENROLLED", "PENDING", "ENROLLED"];
const PAGE_SIZE = 25;

type OfficialStudentRecordRow = OfficialStudentRecord & {
  programs?: Program | null;
};

type StudentAccountRow = Student & {
  profiles?: Pick<Profile, "id" | "email" | "account_status"> | null;
};

type ProfileAccountRow = Pick<Profile, "id" | "email" | "account_status">;

type StudentRecordParams = {
  created?: string;
  updated?: string;
  error?: string;
  q?: string;
  program_id?: string;
  year_level?: string;
  student_type?: string;
  enrollment_status?: string;
  page?: string;
};

type ValidatedFilters = {
  search: string;
  programId: string;
  yearLevel: string;
  studentType: string;
  enrollmentStatus: string;
};

function accountMatchTone(state: OfficialRecordAccountMatch["state"]) {
  if (state === "exact") return "success";
  if (state === "email_only" || state === "student_id_only") return "warning";
  if (state === "conflict") return "error";
  return "neutral";
}

function accountStatusTone(status: AccountStatus) {
  return status === "ACTIVE" ? "success" : "warning";
}

function getValidatedFilters(params: StudentRecordParams, programs: Program[]): ValidatedFilters {
  return {
    search: normalizeOfficialRecordSearch(params.q),
    programId: programs.some((program) => program.id === params.program_id) ? String(params.program_id) : "",
    yearLevel: YEAR_LEVELS.includes(params.year_level as YearLevel) ? String(params.year_level) : "",
    studentType: STUDENT_TYPE_TAGS.includes(params.student_type as StudentType) ? String(params.student_type) : "",
    enrollmentStatus: ENROLLMENT_STATUSES.includes(params.enrollment_status as EnrollmentStatus)
      ? String(params.enrollment_status)
      : ""
  };
}

function buildStudentRecordsUrl(filters: ValidatedFilters, page: number) {
  const query = new URLSearchParams();
  if (filters.search) query.set("q", filters.search);
  if (filters.programId) query.set("program_id", filters.programId);
  if (filters.yearLevel) query.set("year_level", filters.yearLevel);
  if (filters.studentType) query.set("student_type", filters.studentType);
  if (filters.enrollmentStatus) query.set("enrollment_status", filters.enrollmentStatus);
  if (page > 1) query.set("page", String(page));

  const queryString = query.toString();
  return queryString ? `/admin/students?${queryString}` : "/admin/students";
}

export default async function StudentRecordsPage({
  searchParams
}: {
  searchParams?: Promise<StudentRecordParams>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};
  const { data: programsData, error: programsError } = await supabase.from("programs").select("*").order("name");

  if (programsError) {
    console.error("official_student_records:programs_load");
    return (
      <EmptyState
        title="Programs could not be loaded."
        description="Official student records cannot be managed until program information is available. Please try again."
      />
    );
  }

  const programs = (programsData as Program[] | null) ?? [];
  const filters = getValidatedFilters(params, programs);
  const requestedPage = parsePositivePage(params.page);
  const from = (requestedPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let recordsQuery = supabase
    .from("official_student_records")
    .select("*, programs(*)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (filters.programId) recordsQuery = recordsQuery.eq("program_id", filters.programId);
  if (filters.yearLevel) recordsQuery = recordsQuery.eq("year_level", filters.yearLevel);
  if (filters.studentType) recordsQuery = recordsQuery.eq("student_type", filters.studentType);
  if (filters.enrollmentStatus) recordsQuery = recordsQuery.eq("enrollment_status", filters.enrollmentStatus);

  const searchFilter = buildOfficialRecordSearchFilter(filters.search);
  if (searchFilter) recordsQuery = recordsQuery.or(searchFilter);

  const { data: recordsData, count, error: recordsError } = await recordsQuery;

  if (recordsError) {
    console.error("official_student_records:records_load");
    return (
      <div className="space-y-6">
        <Card className="border-t-4 border-t-primary-800">
          <CardHeader
            title="Official Student Records"
            description="Add a Registrar-managed source record when the records list is available again."
          />
          <details className="group border border-slateui-border bg-slateui-surfaceAlt" open={Boolean(params.error)}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary-900 marker:hidden [&::-webkit-details-marker]:hidden">
              Add Official Record
              <span className="text-xs font-medium text-slateui-muted group-open:hidden">Open</span>
              <span className="hidden text-xs font-medium text-slateui-muted group-open:inline">Close</span>
            </summary>
            <div className="border-t border-slateui-border bg-white p-4">
              <OfficialStudentRecordForm action={addOfficialStudentRecordAction} programs={programs} submitLabel="Save Official Record" />
            </div>
          </details>
        </Card>
        <EmptyState
          title="Official student records could not be loaded."
          description="Please try again. No record results are shown until the current information can be loaded."
        />
      </div>
    );
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const shouldCanonicalizePage = params.page !== undefined && params.page !== String(page);

  if (requestedPage !== page || shouldCanonicalizePage) {
    redirect(buildStudentRecordsUrl(filters, page));
  }

  const records = (recordsData as OfficialStudentRecordRow[] | null) ?? [];
  const recordEmails = [...new Set(records.map((record) => normalizeOfficialRecordEmail(record.email)).filter(Boolean))];
  const recordStudentIds = [
    ...new Set(records.map((record) => normalizeOfficialRecordStudentId(record.student_id_number)).filter(Boolean))
  ];
  const [emailLookupResult, studentIdLookupResult] = await Promise.all([
    recordEmails.length
      ? supabase
          .from("profiles")
          .select("id, email, account_status")
          .eq("role", "student")
          .in("email", recordEmails)
      : Promise.resolve({ data: [], error: null }),
    recordStudentIds.length
      ? supabase
          .from("students")
          .select("id, student_id_number, profiles(id, email, account_status)")
          .in("student_id_number", recordStudentIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  const accountMatchUnavailable = Boolean(emailLookupResult.error || studentIdLookupResult.error);

  if (emailLookupResult.error) console.error("official_student_records:account_email_lookup");
  if (studentIdLookupResult.error) console.error("official_student_records:account_student_id_lookup");

  const emailAccounts = ((emailLookupResult.data as ProfileAccountRow[] | null) ?? []).map((account) => ({
    email: normalizeOfficialRecordEmail(account.email),
    candidate: { profileId: account.id, accountStatus: account.account_status } satisfies AccountMatchCandidate
  }));
  const studentIdAccounts: Array<{ studentId: string; candidate: AccountMatchCandidate }> = ((studentIdLookupResult.data as StudentAccountRow[] | null) ?? [])
    .flatMap((student) => {
      const profile = student.profiles;
      if (!profile) return [];

      return [{
        studentId: normalizeOfficialRecordStudentId(student.student_id_number),
        candidate: { profileId: profile.id, accountStatus: profile.account_status } satisfies AccountMatchCandidate
      }];
    });

  const accountMatchByRecordId = new Map(
    records.map((record) => {
      const normalizedEmail = normalizeOfficialRecordEmail(record.email);
      const normalizedStudentId = normalizeOfficialRecordStudentId(record.student_id_number);
      const match = resolveOfficialRecordAccountMatch({
        emailMatches: emailAccounts
          .filter((account) => account.email === normalizedEmail)
          .map((account) => account.candidate),
        studentIdMatches: studentIdAccounts
          .filter((account) => account.studentId === normalizedStudentId)
          .map((account) => account.candidate),
        unavailable: accountMatchUnavailable
      });

      return [record.id, match] as const;
    })
  );
  const accountMatches = [...accountMatchByRecordId.values()];
  const accountsOnPage = accountMatches.filter((match) => !["none", "unavailable"].includes(match.state)).length;
  const exactMatches = accountMatches.filter((match) => match.state === "exact").length;
  const needsAccountOrReview = records.length - exactMatches;

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader
          title="Official Records"
          description="Search, filter, and review Registrar-managed source records for account matching."
        />
        {params.created ? (
          <div className="mb-5 border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            <p className="font-semibold">Official student record saved.</p>
            <p className="mt-1 leading-6">
              The student must claim the record, log in, and submit Online Enrollment before appearing in Pending Enrollments, the Masterlist, or dashboard counts.
            </p>
          </div>
        ) : null}
        {params.updated ? (
          <div className="mb-5 border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            <p className="font-semibold">Official student record updated.</p>
            <p className="mt-1 leading-6">Updates here do not create or change enrollment requests or student accounts.</p>
          </div>
        ) : null}
        {params.error ? (
          <div className="mb-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
            {OFFICIAL_RECORD_ERROR_MESSAGES[params.error] ?? "Official student record could not be saved."}
          </div>
        ) : null}
        <div className="mb-5 grid gap-4 md:grid-cols-3">
          <StatCard label="Displayed records" value={records.length} helper="Current page after validated filters" />
          {accountMatchUnavailable ? (
            <StatCard label="Account matching" value="Unavailable" helper="Try again to refresh account-link checks" tone="warning" />
          ) : (
            <>
              <StatCard label="Accounts on this page" value={accountsOnPage} helper={`${exactMatches} exact matches`} tone="success" />
              <StatCard label="Needs account or review" value={needsAccountOrReview} helper="Partial, conflicting, or missing account links" tone="warning" />
            </>
          )}
        </div>
        {accountMatchUnavailable ? (
          <div className="mb-5 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Account match information is unavailable. Official records remain visible, but account links should be checked again later.
          </div>
        ) : null}
        <form className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto_auto] xl:items-end" aria-label="Official student record filters">
          <TextInput label="Search" name="q" placeholder="Name, email, or Student ID" defaultValue={filters.search} />
          <SelectInput label="Program" name="program_id" defaultValue={filters.programId}>
            <option value="">All programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" defaultValue={filters.yearLevel}>
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Classification" name="student_type" defaultValue={filters.studentType}>
            <option value="">All types</option>
            {STUDENT_TYPE_TAGS.map((studentType) => (
              <option key={studentType} value={studentType}>{studentType}</option>
            ))}
          </SelectInput>
          <SelectInput label="Official Record Status" name="enrollment_status" defaultValue={filters.enrollmentStatus}>
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
              columns={["Student name", "Student ID", "Email", "Program", "Year Level", "Type", "Official Record Status", "Account", "Updated", "Action"]}
              rows={records.map((record) => {
                const accountMatch = accountMatchByRecordId.get(record.id) ?? {
                  state: "unavailable",
                  accountStatus: null
                };

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
                  <span key={`${record.id}-account`} className="inline-flex min-w-40 flex-col gap-1 whitespace-normal">
                    <Badge tone={accountMatchTone(accountMatch.state)}>{ACCOUNT_MATCH_LABELS[accountMatch.state]}</Badge>
                    {accountMatch.accountStatus ? (
                      <span className="text-xs text-slateui-muted">
                        Account status: <Badge tone={accountStatusTone(accountMatch.accountStatus)}>{accountMatch.accountStatus}</Badge>
                      </span>
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
            {totalCount > 0 ? (
              <div className="mt-5 flex items-center justify-between border-t border-slateui-border pt-4">
                <div className="text-sm text-slateui-muted">
                  Showing <span className="font-semibold">{from + 1}</span> to{" "}
                  <span className="font-semibold">{Math.min(to + 1, totalCount)}</span> of{" "}
                  <span className="font-semibold">{totalCount}</span> records
                </div>
                {totalPages > 1 ? (
                  <div className="flex gap-2">
                    {page <= 1 ? (
                      <span className={cn(buttonClassName("outline"), "min-h-9 cursor-not-allowed px-3 py-1.5 text-sm opacity-60")}>Previous</span>
                    ) : (
                      <ButtonLink href={buildStudentRecordsUrl(filters, page - 1)} variant="outline" className="min-h-9 px-3 py-1.5 text-sm">Previous</ButtonLink>
                    )}
                    {page >= totalPages ? (
                      <span className={cn(buttonClassName("outline"), "min-h-9 cursor-not-allowed px-3 py-1.5 text-sm opacity-60")}>Next</span>
                    ) : (
                      <ButtonLink href={buildStudentRecordsUrl(filters, page + 1)} variant="outline" className="min-h-9 px-3 py-1.5 text-sm">Next</ButtonLink>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No official student records found."
            description="Official Student Records are Registrar source records for account claiming. They become Pending Enrollments only after a student claims an account and submits Online Enrollment."
          />
        )}
      </Card>

      <Card className="border-t-4 border-t-secondary-600">
        <CardHeader
          title="Add Official Record"
          description="Create a Registrar-managed source record for student account matching."
        />
        <details className="group border border-slateui-border bg-slateui-surfaceAlt" open={Boolean(params.error)}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-primary-900 marker:hidden [&::-webkit-details-marker]:hidden">
            Add Official Record
            <span className="text-xs font-medium text-slateui-muted group-open:hidden">Open form</span>
            <span className="hidden text-xs font-medium text-slateui-muted group-open:inline">Close form</span>
          </summary>
          <div className="border-t border-slateui-border bg-white p-4">
            <OfficialStudentRecordForm action={addOfficialStudentRecordAction} programs={programs} submitLabel="Save Official Record" />
          </div>
        </details>
      </Card>
    </div>
  );
}
