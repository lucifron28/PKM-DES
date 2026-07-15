"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectInput } from "@/components/ui/field";
import { SubjectReferenceTable } from "@/components/student/subject-reference-table";
import { COURSE_OFFERINGS_TERM_25_26, type CourseOfferingSeed } from "@/lib/constants/course-offerings";
import { SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { SubjectSeed } from "@/lib/constants/subjects";
import type { Semester, YearLevel } from "@/types/database";

type HistoricalOfferingGroup = {
  yearLevel: YearLevel;
  offerings: CourseOfferingSeed[];
  totalUnits: number;
};

type CurriculumGroup = {
  yearLevel: YearLevel;
  semester: Semester;
  subjects: SubjectSeed[];
  totalUnits: number;
};

function totalUnits(rows: Array<{ units: number }>) {
  return rows.reduce((sum, row) => sum + row.units, 0);
}

function groupHistoricalOfferings(rows: CourseOfferingSeed[], selectedYear: YearLevel | "") {
  const visibleYears = selectedYear ? [selectedYear] : YEAR_LEVELS;

  return visibleYears
    .map((yearLevel) => {
      const offerings = rows.filter((row) => row.year_level === yearLevel);
      return { yearLevel, offerings, totalUnits: totalUnits(offerings) };
    })
    .filter((group) => group.offerings.length > 0) as HistoricalOfferingGroup[];
}

function groupCurriculumSubjects(rows: SubjectSeed[], selectedYear: YearLevel | "") {
  const visibleYears = selectedYear ? [selectedYear] : YEAR_LEVELS;

  return visibleYears.flatMap((yearLevel) =>
    SEMESTERS.map((semester) => {
      const subjects = rows.filter((row) => row.year_level === yearLevel && row.semester === semester);
      return { yearLevel, semester, subjects, totalUnits: totalUnits(subjects) };
    }).filter((group) => group.subjects.length > 0)
  ) as CurriculumGroup[];
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
  itemLabel: "courses" | "subjects";
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slateui-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <h3 className="text-base font-bold text-slateui-text">{title}</h3>
      <p className="text-sm font-medium text-slateui-muted">
        {count} {count === 1 ? itemLabel.slice(0, -1) : itemLabel} | {total} units
      </p>
    </div>
  );
}

export function SubjectReferenceBrowser({
  programCode,
  programName,
  historicalOfferings,
  curriculumSubjects
}: {
  programCode: string;
  programName: string;
  historicalOfferings: CourseOfferingSeed[];
  curriculumSubjects: SubjectSeed[];
}) {
  const [selectedYear, setSelectedYear] = useState<YearLevel | "">("");
  const historicalGroups = useMemo(
    () => groupHistoricalOfferings(historicalOfferings, selectedYear),
    [historicalOfferings, selectedYear]
  );
  const curriculumGroups = useMemo(
    () => groupCurriculumSubjects(curriculumSubjects, selectedYear),
    [curriculumSubjects, selectedYear]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Subject List"
          description="This page provides source-based academic references. Your actual enrollment subjects are determined by your submitted enrollment record and Registrar review."
          action={<ButtonLink href="/student/enrollment-status" variant="outline">View Enrollment Status</ButtonLink>}
        />
      </Card>

      <Card>
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

        <dl className="grid gap-3 rounded-md bg-slateui-surfaceAlt p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slateui-muted">Program</dt>
            <dd className="mt-1 font-semibold text-slateui-text">{programName}</dd>
          </div>
          <div>
            <dt className="font-medium text-slateui-muted">Program Code</dt>
            <dd className="mt-1 font-semibold text-slateui-text">{programCode}</dd>
          </div>
        </dl>

        {programCode === "BSAIS" ? (
          <aside className="mt-5 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            <p className="font-semibold">Source note</p>
            <p className="mt-1 font-medium">Historical workbook source note</p>
            <p className="mt-1">
              The supplied course-offering workbook contains duplicate BSAIS blocks and reports six 4th Year units, but no visible 4th Year BSAIS course rows were available in the supplied sheet. No missing offering rows were invented.
            </p>
          </aside>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SelectInput
              label="Year Level"
              name="year_level"
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value as YearLevel | "")}
            >
              <option value="">All year levels</option>
              {YEAR_LEVELS.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </SelectInput>
          </div>
          {selectedYear ? (
            <Button type="button" variant="outline" onClick={() => setSelectedYear("") }>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Show All
            </Button>
          ) : null}
        </div>

        <div className="mt-6">
          {!historicalOfferings.length ? (
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

      {programCode === "BSAIS" ? (
        <Card>
          <CardHeader
            title="BSAIS Curriculum Reference"
            description="Full BSAIS curriculum reference derived from the client-provided Subjects document. These curriculum rows support the research-MVP BSAIS subject seed. They are not proof that you are currently enrolled in every listed subject."
            action={<Badge tone="brand">{curriculumSubjects.length} curriculum subjects</Badge>}
          />

          <div className="mt-6">
            {!curriculumGroups.length ? (
              <EmptyState title="No BSAIS curriculum subjects were found for the selected year level." />
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
