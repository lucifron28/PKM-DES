import type { SupabaseClient } from "@supabase/supabase-js";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { ACADEMIC_YEAR_OPTIONS, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type {
  Enrollment,
  EnrollmentReviewStatus,
  Profile,
  Program,
  Semester,
  Student,
  YearLevel
} from "@/types/database";

const REPORT_PAGE_SIZE = 250;
const FILTER_KEYS = ["search", "program", "academic_year", "year_level", "semester", "status"] as const;

export type ProgramOption = Pick<Program, "id" | "name" | "code">;

export type FetchEnrollmentsParams = {
  search?: string;
  program?: string;
  academic_year?: string;
  year_level?: YearLevel;
  semester?: Semester;
  status?: EnrollmentReviewStatus;
};

export type EnrollmentReportingRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
  programs?: Program | null;
};

export type EnrollmentReportingStage = "programs_load" | "enrollments_load";

export type EnrollmentReportingResult =
  | {
      ok: true;
      filters: FetchEnrollmentsParams;
      programOptions: ProgramOption[];
      selectedProgram: ProgramOption | null;
      enrollments: EnrollmentReportingRow[];
      databaseRecordCount: number;
    }
  | { ok: false; stage: EnrollmentReportingStage };

type SearchableEnrollmentRow = Pick<EnrollmentReportingRow, "students">;

export function programFilterValue(program: ProgramOption) {
  const code = program.code?.trim();
  return code || program.id;
}

export function nextEnrollmentReportOffset(offset: number, returnedRowCount: number) {
  return returnedRowCount === 0 ? null : offset + returnedRowCount;
}

function firstValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function isAllowedValue<T extends readonly string[]>(value: string | undefined, allowed: T): value is T[number] {
  return Boolean(value && allowed.includes(value));
}

export function normalizeEnrollmentSearch(value: string | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").slice(0, 100) ?? "";
  return normalized || undefined;
}

export function normalizeEnrollmentFilters(
  input: Record<string, string | string[] | undefined>,
  programOptions: ProgramOption[]
): FetchEnrollmentsParams {
  const programValue = firstValue(input.program);
  const selectedProgram = programValue
    ? programOptions.find((program) => program.id === programValue || programFilterValue(program) === programValue)
    : undefined;
  const academicYear = firstValue(input.academic_year);
  const yearLevel = firstValue(input.year_level);
  const semester = firstValue(input.semester);
  const status = firstValue(input.status);

  return {
    ...(normalizeEnrollmentSearch(firstValue(input.search)) ? { search: normalizeEnrollmentSearch(firstValue(input.search)) } : {}),
    ...(selectedProgram ? { program: programFilterValue(selectedProgram) } : {}),
    ...(isAllowedValue(academicYear, ACADEMIC_YEAR_OPTIONS) ? { academic_year: academicYear } : {}),
    ...(isAllowedValue(yearLevel, YEAR_LEVELS) ? { year_level: yearLevel } : {}),
    ...(isAllowedValue(semester, SEMESTERS) ? { semester } : {}),
    ...(isAllowedValue(status, ENROLLMENT_REVIEW_STATUSES) ? { status } : {})
  };
}

export function selectedProgramForFilters(programOptions: ProgramOption[], filters: FetchEnrollmentsParams) {
  return filters.program
    ? programOptions.find((program) => program.id === filters.program || programFilterValue(program) === filters.program) ?? null
    : null;
}

export function serializeEnrollmentFilters(filters: FetchEnrollmentsParams, programOptions: ProgramOption[] = []) {
  const params = new URLSearchParams();

  FILTER_KEYS.forEach((key) => {
    const selectedProgram = key === "program" ? selectedProgramForFilters(programOptions, filters) : null;
    const value = selectedProgram ? programFilterValue(selectedProgram) : filters[key];
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

export function hasCanonicalEnrollmentFilters(
  input: Record<string, string | string[] | undefined>,
  filters: FetchEnrollmentsParams,
  programOptions: ProgramOption[] = []
) {
  const received = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => received.append(key, entry));
    } else if (typeof value === "string") {
      received.set(key, value);
    }
  });

  return received.toString() === serializeEnrollmentFilters(filters, programOptions);
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function enrollmentMatchesSearch(enrollment: SearchableEnrollmentRow, search: string | undefined) {
  if (!search) {
    return true;
  }

  const term = normalizeSearchValue(search);
  const studentId = normalizeSearchValue(enrollment.students?.student_id_number);
  const firstName = normalizeSearchValue(enrollment.students?.profiles?.first_name);
  const lastName = normalizeSearchValue(enrollment.students?.profiles?.last_name);
  const firstLast = normalizeSearchValue(`${firstName} ${lastName}`);
  const lastFirst = normalizeSearchValue(`${lastName} ${firstName}`);

  return [studentId, firstName, lastName, firstLast, lastFirst].some((candidate) => candidate.includes(term));
}

export function filterEnrollmentRowsBySearch(rows: EnrollmentReportingRow[], search: string | undefined) {
  return rows.filter((row) => enrollmentMatchesSearch(row, search));
}

export function countEnrollmentStatuses(rows: Array<Pick<EnrollmentReportingRow, "status">>) {
  return rows.reduce(
    (counts, row) => {
      counts.total += 1;
      counts[row.status] += 1;
      return counts;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0, total: 0 }
  );
}

export function getEnrollmentReportCriteria(filters: FetchEnrollmentsParams, selectedProgram: ProgramOption | null) {
  const programValue = selectedProgram ? programFilterValue(selectedProgram) : null;
  const programLabel = selectedProgram
    ? `${selectedProgram.name}${programValue !== selectedProgram.id ? ` (${programValue})` : ""}`
    : "All";

  return [
    ["Search Query", filters.search ?? "None"],
    ["Program", programLabel],
    ["Academic Year", filters.academic_year ?? "All"],
    ["Year Level", filters.year_level ?? "All"],
    ["Semester", filters.semester ?? "All"],
    ["Review Status", filters.status ?? "All"]
  ] as [string, string][];
}

export function hasActiveEnrollmentFilters(filters: FetchEnrollmentsParams) {
  return FILTER_KEYS.some((key) => Boolean(filters[key]));
}

function applyEnrollmentFilters<T>(query: T, selectedProgram: ProgramOption | null, filters: FetchEnrollmentsParams): T {
  const filteredQuery = query as T & {
    eq: (column: string, value: string) => T;
  };
  let result = filteredQuery;

  if (selectedProgram) {
    result = result.eq("program_id", selectedProgram.id) as typeof result;
  }
  if (filters.academic_year) {
    result = result.eq("academic_year", filters.academic_year) as typeof result;
  }
  if (filters.year_level) {
    result = result.eq("year_level", filters.year_level) as typeof result;
  }
  if (filters.semester) {
    result = result.eq("semester", filters.semester) as typeof result;
  }
  if (filters.status) {
    result = result.eq("status", filters.status) as typeof result;
  }

  return result as T;
}

export async function fetchEnrollmentFilterData(
  // The admin server client is generic because the project keeps hand-authored database types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  input: Record<string, string | string[] | undefined>
): Promise<EnrollmentReportingResult> {
  const { data: programsData, error: programsError } = await supabase
    .from("programs")
    .select("id, name, code")
    .order("name")
    .returns<ProgramOption[]>();

  if (programsError) {
    return { ok: false, stage: "programs_load" };
  }

  const programOptions = programsData ?? [];
  const filters = normalizeEnrollmentFilters(input, programOptions);
  const selectedProgram = selectedProgramForFilters(programOptions, filters);
  const completeRows: EnrollmentReportingRow[] = [];

  for (let offset: number | null = 0; offset !== null; ) {
    const baseQuery = supabase
      .from("enrollments")
      .select("*, students(*, profiles(*)), programs(*)")
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + REPORT_PAGE_SIZE - 1);
    const { data, error } = await applyEnrollmentFilters(baseQuery, selectedProgram, filters);

    if (error) {
      return { ok: false, stage: "enrollments_load" };
    }

    const pageRows = (data ?? []) as EnrollmentReportingRow[];
    completeRows.push(...pageRows);
    offset = nextEnrollmentReportOffset(offset, pageRows.length);
  }

  return {
    ok: true,
    filters,
    programOptions,
    selectedProgram,
    enrollments: filterEnrollmentRowsBySearch(completeRows, filters.search),
    databaseRecordCount: completeRows.length
  };
}
