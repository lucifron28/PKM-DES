import type { Semester, YearLevel } from "@/types/database";

export type CourseOfferingSeed = {
  source_program_code: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  course_code: string;
  course_description: string;
  units: number;
};

export const COURSE_OFFERINGS_TERM_25_26 = {
  academic_year: "2025-2026",
  semester: "2nd Semester" as Semester,
  source_file: "LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx"
};
