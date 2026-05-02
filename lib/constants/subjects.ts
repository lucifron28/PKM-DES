import type { Semester, YearLevel } from "@/types/database";

export type SubjectSeed = {
  course_code: string;
  course_description: string;
  units: number;
  year_level: YearLevel;
  semester: Semester;
};

export const AIS_SUBJECTS: SubjectSeed[] = [
  { course_code: "GE-1", course_description: "Understanding the Self", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "GE-2", course_description: "Purposive Communication", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "GE-3", course_description: "Mathematics in the Modern World", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "AE-1", course_description: "Financial Accounting and Reporting", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "AE-2", course_description: "Managerial Economics", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "CBME-1", course_description: "Operation Management and TQM", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "PE 1", course_description: "Human Enhancement", units: 2, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "NSTP 1", course_description: "National Service Training Program", units: 3, year_level: "1st Year", semester: "1st Semester" },
  { course_code: "GE-4", course_description: "Readings in the Philippine History", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "GE-5", course_description: "Science, Technology, and Society", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "AE-3", course_description: "Conceptual Frameworks and Accounting Standards", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "AE-4", course_description: "Cost Accounting and Control", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "AE-5", course_description: "Law on Obligations and Contracts", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "AE-6", course_description: "Economic Development", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "PE 2", course_description: "Fitness Exercise for Specific Sports", units: 3, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "NSTP 2", course_description: "National Service Training Program", units: 2, year_level: "1st Year", semester: "2nd Semester" },
  { course_code: "GE-6", course_description: "Ethics", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "GE-7", course_description: "Rizal's Life and Works", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "AE-7", course_description: "Intermediate Accounting 1", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "AE-8", course_description: "Strategic Cost Management", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "AE-9", course_description: "Income Taxation", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "AE-10", course_description: "Business Laws and Regulations", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "AE-11", course_description: "Financial Markets", units: 3, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "PE 3", course_description: "Physical Activities Towards Health and Fitness in Dance", units: 2, year_level: "2nd Year", semester: "1st Semester" },
  { course_code: "GE-Elec 1", course_description: "Business Logic", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-12", course_description: "Introduction Accounting Information System", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-13", course_description: "Intermediate Accounting 2", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-14", course_description: "Business Taxation", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-15", course_description: "Regulatory Framework and Legal Issues in Business", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-16", course_description: "Financial Management", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "AE-17", course_description: "Management Science", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "PE 4", course_description: "Physical Activities Towards Health and Fitness in Sports", units: 2, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "GE-Elec 2", course_description: "Social Science and Philosophy", units: 3, year_level: "2nd Year", semester: "2nd Semester" },
  { course_code: "PC-1", course_description: "Information System Analysis and Design", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "PC-2", course_description: "Project Management", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "AE-18", course_description: "IT Applications Tools in Business", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "AE-19", course_description: "Intermediate Accounting 3", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "AE-20", course_description: "Accounting Research Methods", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "AE-21", course_description: "Strategic Business Analysis", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "GE-8", course_description: "Contemporary World", units: 3, year_level: "3rd Year", semester: "1st Semester" },
  { course_code: "PC-3", course_description: "Managing Information and Technology", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "PC-4", course_description: "Information System Operations and Maintenance", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "PC-5", course_description: "Information Security and Management", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "AE-22", course_description: "Statistical Analysis with Software Application", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "AE-23", course_description: "International Business and Trade", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "AE-24", course_description: "Governance, Business Ethics, Risk Management", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "PC-Elec 1", course_description: "Financial Modelling", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "GE-9", course_description: "Art Appreciation", units: 3, year_level: "3rd Year", semester: "2nd Semester" },
  { course_code: "AE-25", course_description: "Accounting Information System Internship", units: 6, year_level: "4th Year", semester: "1st Semester" },
  { course_code: "AE-26", course_description: "Accounting Information System Research", units: 3, year_level: "4th Year", semester: "1st Semester" },
  { course_code: "GE-10", course_description: "Art and Humanities", units: 3, year_level: "4th Year", semester: "2nd Semester" },
  { course_code: "PC-6", course_description: "Data Warehousing and Management", units: 3, year_level: "4th Year", semester: "2nd Semester" },
  { course_code: "PC-7", course_description: "Management Information System", units: 3, year_level: "4th Year", semester: "2nd Semester" },
  { course_code: "PC-8", course_description: "Enterprise Resource Planning and Management", units: 3, year_level: "4th Year", semester: "2nd Semester" },
  { course_code: "CBME-2", course_description: "Strategic Management", units: 3, year_level: "4th Year", semester: "2nd Semester" },
  { course_code: "PC-Elec 2", course_description: "Business Analytics", units: 3, year_level: "4th Year", semester: "2nd Semester" }
];
