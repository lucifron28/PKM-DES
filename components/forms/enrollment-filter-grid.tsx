import { SelectInput, TextInput } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { SEMESTERS, YEAR_LEVELS, ACADEMIC_YEAR_OPTIONS } from "@/lib/constants/pkm";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import type { ProgramOption, FetchEnrollmentsParams } from "@/lib/enrollment/query";

type EnrollmentFilterGridProps = {
  params: FetchEnrollmentsParams;
  programOptions: ProgramOption[];
  showAcademicYear?: boolean;
  showReset?: boolean;
};

export function EnrollmentFilterGrid({
  params,
  programOptions,
  showAcademicYear = false,
  showReset = false
}: EnrollmentFilterGridProps) {
  const gridClass = showAcademicYear
    ? "print-hidden grid gap-4 lg:grid-cols-report-filters lg:items-end"
    : "print-hidden grid gap-4 lg:grid-cols-admin-filters lg:items-end";

  return (
    <form className={gridClass}>
      <TextInput
        label="Search"
        name="search"
        placeholder="Name or ID"
        defaultValue={params.search ?? ""}
      />

      <SelectInput label="Program" name="program" defaultValue={params.program ?? ""}>
        <option value="">All programs</option>
        {programOptions.map((program) => (
          <option key={program.id} value={program.code ?? program.id}>
            {program.name}
          </option>
        ))}
      </SelectInput>

      {showAcademicYear && (
        <SelectInput label="Academic Year" name="academic_year" defaultValue={params.academic_year ?? ""}>
          <option value="">All academic years</option>
          {ACADEMIC_YEAR_OPTIONS.map((academicYear) => (
            <option key={academicYear} value={academicYear}>
              {academicYear}
            </option>
          ))}
        </SelectInput>
      )}

      <SelectInput label="Year Level" name="year_level" defaultValue={params.year_level ?? ""}>
        <option value="">All year levels</option>
        {YEAR_LEVELS.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </SelectInput>

      <SelectInput label="Semester" name="semester" defaultValue={params.semester ?? ""}>
        <option value="">All semesters</option>
        {SEMESTERS.map((semester) => (
          <option key={semester} value={semester}>
            {semester}
          </option>
        ))}
      </SelectInput>

      <SelectInput label="Review Status" name="status" defaultValue={params.status ?? ""}>
        <option value="">All statuses</option>
        {ENROLLMENT_REVIEW_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </SelectInput>

      <Button type="submit">Apply {showReset ? "" : "Filters"}</Button>

      {showReset && (
        <ButtonLink href="/admin/reports" variant="outline">
          Reset
        </ButtonLink>
      )}
    </form>
  );
}
