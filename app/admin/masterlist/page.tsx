import { Badge, enrollmentBadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput } from "@/components/ui/field";
import { SimpleTable } from "@/components/tables/simple-table";
import { PROGRAM, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import { requireRole } from "@/lib/auth/session";
import { formatName } from "@/lib/utils/format";
import type { Enrollment, Profile, Semester, Student, YearLevel } from "@/types/database";

type MasterlistRow = Enrollment & {
  students?: (Student & { profiles?: Profile | null }) | null;
};

export default async function EnrollmentMasterlistPage({
  searchParams
}: {
  searchParams?: Promise<{ year_level?: YearLevel; semester?: Semester }>;
}) {
  const { supabase } = await requireRole("admin");
  const params = (await searchParams) ?? {};

  let query = supabase
    .from("enrollments")
    .select("*, students(*, profiles(*)), programs(*)")
    .order("submitted_at", { ascending: false });

  if (params.year_level && YEAR_LEVELS.includes(params.year_level)) {
    query = query.eq("year_level", params.year_level);
  }

  if (params.semester && SEMESTERS.includes(params.semester)) {
    query = query.eq("semester", params.semester);
  }

  const { data } = await query;
  const rows = (data as MasterlistRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Enrollment Masterlist" description="Officially enrolled students and pending or incomplete enrollment records." />
        <form className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <SelectInput label="Program" name="program" defaultValue={PROGRAM.code}>
            <option value={PROGRAM.code}>{PROGRAM.name}</option>
          </SelectInput>
          <SelectInput label="Year Level" name="year_level" defaultValue={params.year_level ?? ""}>
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
          <SelectInput label="Semester" name="semester" defaultValue={params.semester ?? ""}>
            <option value="">All semesters</option>
            {SEMESTERS.map((semester) => (
              <option key={semester} value={semester}>{semester}</option>
            ))}
          </SelectInput>
          <Button type="submit">Apply Filters</Button>
        </form>
      </Card>
      {rows.length ? (
        <SimpleTable
          columns={["Student name", "Student ID", "Program", "Year Level", "Semester", "Enrollment status"]}
          rows={rows.map((enrollment) => [
            formatName(enrollment.students?.profiles?.first_name, enrollment.students?.profiles?.last_name),
            enrollment.students?.student_id_number ?? "Not provided",
            enrollment.programs?.name ?? "Not available",
            enrollment.year_level,
            enrollment.semester,
            <Badge key={enrollment.id} tone={enrollmentBadgeTone(enrollment.students?.enrollment_status)}>
              {enrollment.students?.enrollment_status ?? enrollment.status}
            </Badge>
          ])}
        />
      ) : (
        <EmptyState title="No enrollment records found." />
      )}
    </div>
  );
}
