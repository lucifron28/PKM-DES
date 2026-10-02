export const REGISTRATION_POLICY_VERSION = "pledge-v1";

export const REGISTRATION_POLICY_CONTENT = {
  title: "FREE HIGHER EDUCATION POLICY AND ENROLLMENT GUIDELINES",
  freeHigherEducationHeading: "FREE HIGHER EDUCATION POLICY",
  freeHigherEducationParagraphs: [
    "The Institution implements Free Higher Education in accordance with Republic Act No. 10931, otherwise known as the Universal Access to Quality Tertiary Education Act, and its Implementing Rules and Regulations, as implemented by the Commission on Higher Education (CHED) and the Unified Student Financial Assistance System for Tertiary Education (UniFAST).",
    "Students shall be eligible to avail of Free Higher Education benefits, subject to compliance with the admission and retention requirements of State Universities and Colleges (SUCs) and Local Universities and Colleges (LUCs), in accordance with applicable Commission on Higher Education (CHED) and Unified Student Financial Assistance System for Tertiary Education (UniFAST) policies and guidelines, and shall maintain eligibility in accordance with institutional rules, academic policies and government regulations on subsidy coverage, including observance of the normative duration of the academic program."
  ],
  enrollmentGuidelinesHeading: "ENROLLMENT GUIDELINES",
  enrollmentGuidelinesSubtitle: "(Changing/Adding/Dropping of Subject)",
  enrollmentGuidelinesParagraph:
    "Students who intend to add, change, or drop subjects must accomplish the prescribed form within two (2) weeks from the start of classes, subject to the approval of the Academic Adviser, Dean, and Registrar. Any subject not officially dropped within the prescribed period shall be considered validly enrolled, and the student shall be accorded the corresponding academic grade and recorded enrollment status in accordance with institutional policies.",
  warning: "WARNING: Follow strictly subject pre-requisites.",
  pledgeHeading: "STUDENT'S PLEDGE",
  pledge:
    "In consideration of my admission to the Pambayang Kolehiyo ng Mauban and of the privileges of a student in this institution, I hereby promise and pledge to abide by and comply with all rules and regulations laid down by competent authority in the college.",
  signatureLabel: "Student's Signature"
} as const;

export const REGISTRATION_POLICY_TEXT = [
  REGISTRATION_POLICY_CONTENT.title,
  REGISTRATION_POLICY_CONTENT.freeHigherEducationHeading,
  ...REGISTRATION_POLICY_CONTENT.freeHigherEducationParagraphs,
  REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesHeading,
  REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesSubtitle,
  REGISTRATION_POLICY_CONTENT.enrollmentGuidelinesParagraph,
  REGISTRATION_POLICY_CONTENT.warning,
  REGISTRATION_POLICY_CONTENT.pledgeHeading,
  REGISTRATION_POLICY_CONTENT.pledge,
  REGISTRATION_POLICY_CONTENT.signatureLabel
].join("\n\n");
