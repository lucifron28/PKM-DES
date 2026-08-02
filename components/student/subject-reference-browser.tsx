"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput } from "@/components/ui/field";
import { SubjectReferenceTable } from "@/components/student/subject-reference-table";
import { COURSE_OFFERINGS_TERM_25_26 } from "@/lib/constants/course-offerings";
import { YEAR_LEVELS } from "@/lib/constants/pkm";
import type { SubjectSeed } from "@/lib/constants/subjects";
import type { Semester, StandardLoadSet, YearLevel, Program } from "@/types/database";

export interface DBOfferingRow {
  id: string;
  program_id: string;
  program_code: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  course_code: string;
  course_description: string;
  units: number;
  source_document: string;
}

type HistoricalOfferingGroup = {
  yearLevel: YearLevel;
  offerings: DBOfferingRow[];
  totalUnits: number;
};

type CurriculumGroup = {
  yearLevel: YearLevel;
  semester: Semester;
  subjects: SubjectSeed[];
  totalUnits: number;
};

type CurriculumSubjectRow = SubjectSeed & { program_code: string };
type ActiveStandardLoad = Pick<
  StandardLoadSet,
  "program_id" | "academic_year" | "semester" | "year_level" | "status" | "expected_course_count" | "expected_total_units" | "source_document"
>;

function totalUnits(rows: Array<{ units: number }>) {
  return rows.reduce((sum, row) => sum + row.units, 0);
}

function groupHistoricalOfferings(rows: DBOfferingRow[], selectedYear: YearLevel | ""): HistoricalOfferingGroup[] {
  const yearsToGroup: YearLevel[] = selectedYear ? [selectedYear] : ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  return yearsToGroup
    .map((yearLevel) => {
      const offerings = rows.filter((r) => r.year_level === yearLevel);
      return {
        yearLevel,
        offerings,
        totalUnits: totalUnits(offerings)
      };
    })
    .filter((group) => group.offerings.length > 0);
}

function groupCurriculumSubjects(rows: SubjectSeed[], selectedYear: YearLevel | ""): CurriculumGroup[] {
  const yearsToGroup: YearLevel[] = selectedYear ? [selectedYear] : ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const semestersToGroup: Semester[] = ["1st Semester", "2nd Semester"];
  const groups: CurriculumGroup[] = [];

  for (const yearLevel of yearsToGroup) {
    for (const semester of semestersToGroup) {
      const subjects = rows.filter((r) => r.year_level === yearLevel && r.semester === semester);
      if (subjects.length > 0) {
        groups.push({
          yearLevel,
          semester,
          subjects,
          totalUnits: totalUnits(subjects)
        });
      }
    }
  }

  return groups;
}

function GroupHeading({
  title,
  count,
  total,
  itemLabel
}: {
  title: string;
  count: number;
  total: number;
  itemLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slateui-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <h3 className="text-sm font-bold text-slateui-text sm:text-base">{title}</h3>
      <p className="text-sm font-medium text-slateui-muted">
        {count} {count === 1 ? itemLabel.slice(0, -1) : itemLabel} | {total} units
      </p>
    </div>
  );
}

export function SubjectReferenceBrowser({
  studentProgramCode,
  studentProgramName,
  programs,
  historicalOfferings,
  curriculumSubjects,
  activeStandardLoads,
  activeTerm,
  historicalOfferingsError,
  curriculumSubjectsError,
  activeStandardLoadsError
}: {
  studentProgramCode: string | null;
  studentProgramName: string;
  programs: Array<Pick<Program, "id" | "name" | "code">>;
  historicalOfferings: DBOfferingRow[];
  curriculumSubjects: CurriculumSubjectRow[];
  activeStandardLoads: ActiveStandardLoad[];
  activeTerm: { academicYear: string; semester: Semester } | null;
  historicalOfferingsError?: boolean;
  curriculumSubjectsError?: boolean;
  activeStandardLoadsError?: boolean;
}) {
  const initialProgramCode = useMemo(() => {
    if (studentProgramCode && historicalOfferings.some((o) => o.program_code === studentProgramCode)) {
      return studentProgramCode;
    }
    if (studentProgramCode && programs.some((p) => p.code === studentProgramCode)) {
      return studentProgramCode;
    }
    return programs.find((program) => Boolean(program.code))?.code ?? "";
  }, [historicalOfferings, programs, studentProgramCode]);

  const [selectedProgramCode, setSelectedProgramCode] = useState<string>(initialProgramCode);
  const [selectedYear, setSelectedYear] = useState<YearLevel | "">("");

  const activeProgram = programs.find((p) => p.code === selectedProgramCode) ?? {
    id: "",
    code: selectedProgramCode,
    name: studentProgramCode === selectedProgramCode ? studentProgramName : selectedProgramCode
  };

  const programOfferings = useMemo(
    () => historicalOfferings.filter((o) => o.program_code === selectedProgramCode),
    [historicalOfferings, selectedProgramCode]
  );

  const historicalGroups = useMemo(
    () => groupHistoricalOfferings(programOfferings, selectedYear),
    [programOfferings, selectedYear]
  );

  const programCurriculumSubjects = useMemo(
    () => curriculumSubjects.filter((subject) => subject.program_code === selectedProgramCode),
    [curriculumSubjects, selectedProgramCode]
  );

  const curriculumGroups = useMemo(
    () => groupCurriculumSubjects(programCurriculumSubjects, selectedYear),
    [programCurriculumSubjects, selectedYear]
  );

  const activeProgramLoads = useMemo(
    () => activeStandardLoads.filter((load) =>
      load.program_id === activeProgram.id &&
      load.academic_year === activeTerm?.academicYear &&
      load.semester === activeTerm?.semester
    ),
    [activeProgram.id, activeStandardLoads, activeTerm]
  );

  const isUnassignedProgram = !studentProgramCode;
  const hasNoOfferingsForStudentProgram = Boolean(
    studentProgramCode &&
      !historicalOfferings.some((o) => o.program_code === studentProgramCode)
  );

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-primary-800">
        <CardHeader
          title="Subject List & Course Offering Reference"
          description="This page provides source-based academic references across all institutional programs. Your actual enrollment subjects are determined by your submitted enrollment record and Registrar review."
          action={<ButtonLink href="/student/enrollment-status" variant="outline">View Enrollment Status</ButtonLink>}
        />
      </Card>

      {isUnassignedProgram ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Unassigned Program Notice</p>
          <p className="mt-1 leading-6">
            Your account currently has no official program assigned. Showing the first configured program as an explicitly labeled reference default. Browsing reference programs does not alter your official student record assignment.
          </p>
        </div>
      ) : null}
      <Card className="border-t-4 border-t-secondary-600">
        <CardHeader
          title="Program Course Offering Reference"
          description="Course offerings recorded in the client-provided workbook for AY 2025-2026, 2nd Semester. This is historical reference information and is not your current enrollment subject load."
          action={
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">
                Client-provided AY {COURSE_OFFERINGS_TERM_25_26.academic_year} course-offering workbook
              </Badge>
              <Badge tone="info">{COURSE_OFFERINGS_TERM_25_26.semester}</Badge>
            </div>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Select Program to Browse"
            name="program_select"
            value={selectedProgramCode}
            onChange={(event) => setSelectedProgramCode(event.target.value)}
          >
            {programs.filter((p) => Boolean(p.code)).map((p) => (
              <option key={p.id} value={p.code ?? ""}>
                {p.code} – {p.name}
              </option>
            ))}
          </SelectInput>

          <SelectInput
            label="Year Level Filter"
            name="year_level"
            value={selectedYear || ""}
            onChange={(event) => setSelectedYear(event.target.value as YearLevel | "")}
          >
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </SelectInput>
        </div>

        {hasNoOfferingsForStudentProgram && selectedProgramCode === studentProgramCode ? (
          <aside className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">No Historical Course Offerings Recorded</p>
            <p className="mt-1">
              Your official recorded student program is <strong>{studentProgramName} ({studentProgramCode})</strong>.
              The supplied AY 2025-2026, 2nd Semester workbook does not include course offerings for this program. Select another program above to browse available offerings.
            </p>
          </aside>
        ) : null}

        {studentProgramCode && selectedProgramCode !== studentProgramCode ? (
          <aside className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Browsing Program Notice</p>
            <p className="mt-1">
              You are currently browsing <strong>{activeProgram.name} ({activeProgram.code})</strong>. Your official recorded student program remains <strong>{studentProgramName} ({studentProgramCode})</strong>.
            </p>
          </aside>
        ) : null}

        <dl className="mt-4 grid gap-3 rounded-md bg-slateui-surfaceAlt p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slateui-muted">Active Program</dt>
            <dd className="mt-1 font-semibold text-slateui-text">{activeProgram.name}</dd>
          </div>
          <div>
            <dt className="font-medium text-slateui-muted">Program Code</dt>
            <dd className="mt-1 font-semibold text-slateui-text">{activeProgram.code}</dd>
          </div>
        </dl>

        {selectedProgramCode === "BSAIS" ? (
          <aside className="mt-5 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <p className="font-semibold">Historical workbook source note</p>
            <p className="mt-1">
              The supplied historical course-offering workbook contains duplicate BSAIS blocks and reports six 4th Year units, but no visible 4th Year BSAIS course rows were available in the supplied sheet. No missing offering rows were invented.
            </p>
          </aside>
        ) : (
          <aside className="mt-5 rounded-md border border-slateui-border bg-slateui-surfaceAlt px-4 py-3 text-sm text-slateui-secondary">
            <p className="font-semibold text-slateui-text">Non-BSAIS Historical Reference Notice</p>
            <p className="mt-1">
              These course offerings are historical workbook records from AY 2025-2026, 2nd Semester. Current standard-load availability is shown separately and depends on an active Registrar configuration for the selected program and year level.
            </p>
          </aside>
        )}

        <aside className="mt-4 rounded-md border border-primary-100 bg-primary-50 px-4 py-3 text-sm text-primary-950">
          <p className="font-semibold">Current standard-load availability</p>
          {activeStandardLoadsError ? (
            <p className="mt-1">Current availability could not be loaded. Historical offerings below remain reference-only.</p>
          ) : activeTerm && activeProgramLoads.length ? (
            <p className="mt-1">{activeProgramLoads.length} year-level standard-load configuration{activeProgramLoads.length === 1 ? "" : "s"} available for AY {activeTerm.academicYear}, {activeTerm.semester}.</p>
          ) : activeTerm ? (
            <p className="mt-1">No active standard-load configuration is currently available for this program in AY {activeTerm.academicYear}, {activeTerm.semester}.</p>
          ) : (
            <p className="mt-1">No active enrollment term is currently configured.</p>
          )}
        </aside>

        <div className="mt-5 flex items-center justify-end">
          {selectedYear ? (
            <Button type="button" variant="outline" onClick={() => setSelectedYear("")}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset Year Filter
            </Button>
          ) : null}
        </div>

        <div className="mt-6">
          {historicalOfferingsError ? (
            <EmptyState
              title="Historical course offerings could not be loaded"
              description="Please try again. Historical course offerings failed to load from the database."
            />
          ) : !programOfferings.length ? (
            <EmptyState
              title="No historical offering reference is available"
              description="The supplied AY 2025-2026, 2nd Semester workbook does not include course rows for this program."
            />
          ) : !historicalGroups.length ? (
            <EmptyState title="No historical course offerings were listed for the selected year level." />
          ) : (
            <div className="space-y-5">
              {historicalGroups.map((group) => (
                <div key={`historical-${group.yearLevel}`} className="overflow-hidden rounded-md border border-slateui-border">
                  <GroupHeading
                    title={`${group.yearLevel} historical offerings`}
                    count={group.offerings.length}
                    total={group.totalUnits}
                    itemLabel="courses"
                  />
                  <div className="p-3 sm:p-4">
                    <SubjectReferenceTable rows={group.offerings} codeLabel="Course Code" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {selectedProgramCode && programCurriculumSubjects.length ? (
        <Card className="border-t-4 border-t-primary-800">
          <CardHeader
            title={`${activeProgram.code ?? "Program"} Curriculum Reference`}
            description="Curriculum rows derived from the public.subjects database table. These rows are separate from historical workbook offerings and active standard-load configuration."
            action={<Badge tone="brand">{programCurriculumSubjects.length} curriculum subjects</Badge>}
          />

          <div className="mt-6">
            {curriculumSubjectsError ? (
              <EmptyState
                title="Curriculum reference could not be loaded"
                description="Please try again. Database query for public.subjects failed."
              />
            ) : !curriculumGroups.length ? (
              <EmptyState title="No curriculum subjects were found for the selected year level." />
            ) : (
              <div className="space-y-5">
                {curriculumGroups.map((group) => (
                  <div key={`curriculum-${group.yearLevel}-${group.semester}`} className="overflow-hidden rounded-md border border-slateui-border">
                    <GroupHeading
                      title={`${group.yearLevel} | ${group.semester}`}
                      count={group.subjects.length}
                      total={group.totalUnits}
                      itemLabel="subjects"
                    />
                    <div className="p-3 sm:p-4">
                      <SubjectReferenceTable rows={group.subjects} codeLabel="Subject Code" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
