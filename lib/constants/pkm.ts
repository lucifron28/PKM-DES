import type { Semester, StudentType, YearLevel } from "@/types/database";

export const SITE_NAME =
  "Digital Enrollment System – Pambayang Kolehiyo ng Mauban";

export const PKM_IDENTITY = {
  name: "Pambayang Kolehiyo ng Mauban",
  tagline: "One exceptional College",
  address: "Africandaisy St. Sitio Pilaway Brgy. Polo Mauban, Quezon",
  emails: ["pkmigumauban@gmail.com", "pkm_maubanin@yahoo.com"],
  website: "https://pkmlgumauban.wordpress.com/",
  social: {
    facebook: "https://www.facebook.com/pkm.official.edu.ph",
    instagram: "https://www.instagram.com/pkmlgumauban",
    x: "https://x.com/pkmlgumauban"
  }
};

export const PKM_VISION =
  "A tertiary institution as a center of high-quality education that values and nurtures academic excellence, knowledge, culture, good deeds and morality, adapting with the dynamics needs of the region and the society towards cooperation with the government, communities, business and industry for creating linkages intended in promoting higher ideals for the society, community and students.";

export const PKM_MISSION = [
  "Make a teaching work continuous and systematic that will mold the character and awareness of each youth with special consideration for those who are financially challenged, and will ensure empowerment of the citizens.",
  "Fortify the research skills aimed at the development and creation of new knowledge that can be utilized by the next generation in adopting with the changes for the society to move forward.",
  "Strengthen community awareness by institutionalization of community service programs towards the greater application of academic knowledge of the needs society."
];

export const PKM_GOALS = [
  "To provide the youth of Mauban and its neighboring towns a quality education which is both accessible and affordable.",
  "To create opportunities that will make a difference in the lives of the youth of Mauban.",
  "To instill in the minds of the youth of Mauban the importance of education in uplifting one's life and in serving one's country.",
  "To create linkages between local government units, industry, business and educational institutions aimed at promoting progress in the community."
];

export const PROGRAM = {
  name: "Accounting Information System",
  code: "AIS"
};

export const YEAR_LEVELS: YearLevel[] = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year"
];

export const SEMESTERS: Semester[] = ["1st Semester", "2nd Semester"];

export const CREATE_ACCOUNT_STUDENT_TYPES: StudentType[] = [
  "Incoming 1st Year Student",
  "Transferee",
  "Old Student"
];

export const STUDENT_TYPE_TAGS: StudentType[] = [
  "Incoming 1st Year Student",
  "Transferee",
  "Old Student",
  "Continuing Student",
  "Regular Student",
  "Irregular Student"
];

export const REGISTRAR_MANAGED_SUBJECT_LOAD_TYPES: StudentType[] = [
  "Transferee",
  "Irregular Student"
];

export const ACADEMIC_YEAR_OPTIONS = [
  "2026-2027",
  "2027-2028",
  "2028-2029"
];
