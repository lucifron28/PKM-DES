export const COURSE_OFFERINGS_MANIFEST = {
  canonicalSourceDocument: "LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx",
  workbookSha256: "5352e997d40e1b5da1affaf908ceb2ef8134b64427ba88251813fc9a0a3ac07b",
  academicYear: "2025-2026",
  semester: "2nd Semester",
  expectedTotalRows: 245,
  countsByProgram: {
    BSAIS: 25,
    BSMA: 24,
    BEED: 24,
    ENGLISH: 25,
    FILIPINO: 25,
    MATH: 25,
    SS: 25,
    CRIM: 16,
    ACP: 28,
    FSM: 28
  },
  headingMappings: {
    AIS: "BSAIS",
    BSAIS: "BSAIS",
    MATHEMATICS: "MATH",
    "SOCIAL STUDIES": "SS",
    CRIMINOLOGY: "CRIM",
    ENGLISH: "ENGLISH",
    FILIPINO: "FILIPINO",
    BSMA: "BSMA",
    BEED: "BEED",
    ACP: "ACP",
    FSM: "FSM"
  },
  notes: {
    missingBsais4thYear: "The supplied workbook does not contain 4th Year course offerings for BSAIS.",
    missingCrimUpperYears: "The supplied workbook contains 1st Year and 2nd Year offerings only for CRIM.",
    duplicateBsaisBlock: "The source workbook contains two repeated BSAIS blocks which collapse to 25 unique rows."
  }
} as const;
