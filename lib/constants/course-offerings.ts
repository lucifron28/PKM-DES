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

export const BSAIS_COURSE_OFFERING_TERM = {
  source_program_code: "BSAIS",
  academic_year: "2025-2026",
  semester: "2nd Semester" as Semester,
  source_file: "docs/frd-files/LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx",
  note: "The source workbook lists BSAIS 2nd Semester offerings for SY 2025-2026. It is not a complete curriculum."
};

export const BSAIS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "GE 4", course_description: "Readings in Philippine History", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "GE 5", course_description: "Science, Technology and Society", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "AE 3", course_description: "Conceptual Framework and Accounting Standards", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "AE 4", course_description: "Cost Accounting and Control", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "AE 5", course_description: "Law on Obligations and Contracts", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "AE 6", course_description: "Economic Development", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "PE 2", course_description: "Fitness Exercise for Specific Sports", units: 2 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "1st Year", course_code: "NSTP 2", course_description: "National Service Training Program", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "GE Elec 1", course_description: "Business Logic", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 12", course_description: "Introduction Accounting Information System", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 13", course_description: "Intermediate Accounting 2", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 14", course_description: "Business Taxation", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 15", course_description: "Regulatory Framework and Legal Issues in Business", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 16", course_description: "Financial Management", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "AE 17", course_description: "Management Science", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "PE 4", course_description: "Physical Activities Towards Health and Fitness in Sports", units: 2 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "2nd Year", course_code: "GE Elec 2", course_description: "Social Science and Philosophy", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "PC 3", course_description: "Managing Information and Technology", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "PC 4", course_description: "Information System Operations and Maintenance", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "PC 5", course_description: "Information Security and Management", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "AE 22", course_description: "Statistical Analysis with Software Application", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "AE 23", course_description: "International Business and Trade", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "AE 24", course_description: "Governance, Business Ethics, Risk Management", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "PC Elec 1", course_description: "Financial Modelling", units: 3 },
  { source_program_code: "BSAIS", academic_year: "2025-2026", semester: "2nd Semester", year_level: "3rd Year", course_code: "GE 9", course_description: "Art Appreciation", units: 3 }
];
