"use client";

import { useMemo, useState } from "react";
import { PROGRAM, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import {
  BSAIS_COURSE_OFFERING_TERM,
  BSAIS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  type CourseOfferingSeed
} from "@/lib/constants/course-offerings";
import { AIS_SUBJECTS, type SubjectSeed } from "@/lib/constants/subjects";
import type { Semester, YearLevel } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { SelectInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleTable } from "@/components/tables/simple-table";

type SubjectGroup = {
  yearLevel: YearLevel;
  semester: Semester;
  totalUnits: number;
  subjects: SubjectSeed[];
};

type CourseOfferingGroup = {
  yearLevel: YearLevel;
  totalUnits: number;
  offerings: CourseOfferingSeed[];
};

export default function SubjectListPage() {
  const [draftYear, setDraftYear] = useState<YearLevel | "">("");
  const [selectedYear, setSelectedYear] = useState<YearLevel | "">("");

  const subjects = useMemo(() => {
    if (selectedYear) {
      return AIS_SUBJECTS.filter((subject) => subject.year_level === selectedYear);
    }

    return AIS_SUBJECTS;
  }, [selectedYear]);

  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    const visibleYears = selectedYear ? [selectedYear] : YEAR_LEVELS;

    return visibleYears.flatMap((yearLevel) =>
      SEMESTERS.map((semester) => {
        const semesterSubjects = subjects.filter(
          (subject) => subject.year_level === yearLevel && subject.semester === semester
        );

        return {
          yearLevel,
          semester,
          subjects: semesterSubjects,
          totalUnits: semesterSubjects.reduce((sum, subject) => sum + subject.units, 0)
        };
      }).filter((group) => group.subjects.length > 0)
    );
  }, [selectedYear, subjects]);

  const offeringGroups = useMemo<CourseOfferingGroup[]>(() => {
    const visibleYears = selectedYear ? [selectedYear] : YEAR_LEVELS;

    return visibleYears
      .map((yearLevel) => {
        const offerings = BSAIS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS.filter(
          (offering) => offering.year_level === yearLevel
        );

        return {
          yearLevel,
          offerings,
          totalUnits: offerings.reduce((sum, offering) => sum + offering.units, 0)
        };
      })
      .filter((group) => group.offerings.length > 0);
  }, [selectedYear]);

  function resetFilters() {
    setDraftYear("");
    setSelectedYear("");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Subject List"
          description="View-only source-grounded curriculum subjects and available term course offerings."
        />
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedYear(draftYear);
          }}
        >
          <SelectInput label="Program" name="program" value={PROGRAM.code} disabled>
            <option value={PROGRAM.code}>{PROGRAM.name}</option>
          </SelectInput>
          <SelectInput
            label="Year Level"
            name="year_level"
            value={draftYear}
            onChange={(event) => setDraftYear(event.target.value as YearLevel | "")}
          >
            <option value="">All year levels</option>
            {YEAR_LEVELS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </SelectInput>
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader
          title="BSAIS Course Offerings"
          description={`${BSAIS_COURSE_OFFERING_TERM.note} Source: ${BSAIS_COURSE_OFFERING_TERM.source_file}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">SY {BSAIS_COURSE_OFFERING_TERM.academic_year}</Badge>
              <Badge tone="info">{BSAIS_COURSE_OFFERING_TERM.semester}</Badge>
              <Badge tone="neutral">Program code: {BSAIS_COURSE_OFFERING_TERM.source_program_code}</Badge>
            </div>
          }
        />
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The source workbook has two identical BSAIS blocks. It also shows a 4th Year total of 6 units but no visible
          4th Year BSAIS course rows, so no 4th Year offering rows are displayed here.
        </div>
      </Card>

      {offeringGroups.length ? (
        <div className="space-y-8">
          {offeringGroups.map((group) => (
            <Card key={`offering-${group.yearLevel}`} className="p-0">
              <div className="flex flex-col gap-2 border-b border-slateui-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-slateui-text">
                  {group.yearLevel} - Course Offerings
                </h2>
                <p className="text-sm font-medium text-slateui-muted">
                  {group.offerings.length} courses - {group.totalUnits} units
                </p>
              </div>
              <div className="p-5">
                <SimpleTable
                  columns={["Course Code", "Course Description", "Units", "School Year", "Semester"]}
                  rows={group.offerings.map((offering) => [
                    offering.course_code,
                    offering.course_description,
                    offering.units,
                    `SY ${offering.academic_year}`,
                    offering.semester
                  ])}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No term course offerings found for the selected year level." />
      )}

      <Card>
        <CardHeader
          title="AIS Curriculum Subject Seed"
          description="Full curriculum seed data from the uploaded Subjects.pdf file."
        />
      </Card>

      {subjectGroups.length ? (
        <div className="space-y-8">
          {subjectGroups.map((group) => (
            <Card key={`${group.yearLevel}-${group.semester}`} className="p-0">
              <div className="flex flex-col gap-2 border-b border-slateui-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-slateui-text">
                  {group.yearLevel} - {group.semester}
                </h2>
                <p className="text-sm font-medium text-slateui-muted">
                  {group.subjects.length} subjects - {group.totalUnits} units
                </p>
              </div>
              <div className="p-5">
                <SimpleTable
                  columns={["Subject Code", "Subject Name", "Units"]}
                  rows={group.subjects.map((subject) => [
                    subject.course_code,
                    subject.course_description,
                    subject.units
                  ])}
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No subjects found." />
      )}
    </div>
  );
}
