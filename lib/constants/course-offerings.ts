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
  source_file: "docs/frd-files/LIST OF COURSES FOR 2ND SEM AY 25-26.xlsx"
};

export const BEED_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC-SCI 1",
    "course_description": "Readings in Philippine History",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC-SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "The Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EED 102",
    "course_description": "Educkasyong Pantahanan at Pangkabuhayan with Entrepremeurialism",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EED 104",
    "course_description": "Content and Pedagogy for the Mother-Tongue",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-based Firtness Activities",
    "units": 2
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program 2",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EED 115",
    "course_description": "Teaching PE and Health in Elementary Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EED 106",
    "course_description": "Teaching Math in the Intermediate Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EED 108",
    "course_description": "Teaching Science in Elementary Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFIT 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 116",
    "course_description": "Teaching  Music in Elementary Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 118 TTL 2",
    "course_description": "Technology for Teaching and Elementary Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 110",
    "course_description": "Teaching English in the Elementary Grades Through Literature",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 112",
    "course_description": "Pagtuturo and Filipino sa Elementarya (II) Panitikan ng Pilipinas",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 114",
    "course_description": "Teaching Social Studies in Elementary Grades (Culture and Geography)",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EED 117",
    "course_description": "Teaching Arts in Elementary Grades",
    "units": 3
  },
  {
    "source_program_code": "BEED",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship",
    "units": 6
  }
];

export const ENGLISH_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EL 103",
    "course_description": "Principles and Theories of Language Acquisition and Learning",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EL 109",
    "course_description": "Speech and Theatre Arts",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EL 118",
    "course_description": "Technical Writing",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-Based Fitness Activities",
    "units": 2
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFIT 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EL 107",
    "course_description": "Teaching Assessment of Macro Skills",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EL 111",
    "course_description": "Children and Adolescent Literature",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EL 119",
    "course_description": "Campus Journalism",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EL 120 TTL 2",
    "course_description": "Technology in Language Education",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EL 106",
    "course_description": "Teaching Assessment of Literature Studies",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EL 114",
    "course_description": "Survey of Afro-Asian Literatue",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EL 116",
    "course_description": "Contemporary Popular and Emergent Literature",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EL 112",
    "course_description": "Mythology and Folklore",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EL 115",
    "course_description": "Survey of English and American Literature",
    "units": 3
  },
  {
    "source_program_code": "ENGLISH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship",
    "units": 6
  }
];

export const FILIPINO_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "FIL 103",
    "course_description": "Ang Filipino sa Kurikulum ng Batayang Edukasyon",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "Fil 104",
    "course_description": "Estraktura ng Wikang Filipino",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "LIT 102",
    "course_description": "Kulturang Popular",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-Bases Fitness Activities",
    "units": 2
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "FIL 107",
    "course_description": "Paghahanda at Ebalwasyon ng Kagamitang Panturo",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "FIL 108",
    "course_description": "Introduksyon sa Pagsasalin",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "LIT 103",
    "course_description": "Sanaysay at Talumpati",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFIT 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TTL 2",
    "course_description": "Technology for Teaching and Learning 2",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "FIL 111",
    "course_description": "Barayti at Baryasyo ng Wika",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "FIL 112",
    "course_description": "Mga Natatanging Diskurso sa Wika at Panitikan",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "LIT 106",
    "course_description": "Panulaang Filipino",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "LIT 107",
    "course_description": "Dulang Filipino",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "ELEC 1",
    "course_description": "Pagsasalin sa Iba't-Ibang Disiplijna",
    "units": 3
  },
  {
    "source_program_code": "FILIPINO",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship",
    "units": 6
  }
];

export const MATHEMATICS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-Bases Fitness Activities",
    "units": 2
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "MATH 103",
    "course_description": "Trigonometry",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "MATH 104",
    "course_description": "Plane and Solid Geometry",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "Math 105",
    "course_description": "Mathematics of Investment",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "MATH 108",
    "course_description": "Calculus II",
    "units": 4
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "MATH 109",
    "course_description": "Number Theory",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "MATH 110",
    "course_description": "Advance Statistics",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFIT 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 114",
    "course_description": "Principles and Strategies in Teaching Mathermatics",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 115",
    "course_description": "Abstract Algebra",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 116",
    "course_description": "Problem Solving Mathematical Investigation and Modelling",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 117 TTL2",
    "course_description": "Technology for Teaching and Learning 2",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 118",
    "course_description": "Assessment and Evaluation in Mathematics",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "MATH 119",
    "course_description": "Linear Algebra",
    "units": 3
  },
  {
    "source_program_code": "MATH",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship",
    "units": 6
  }
];

export const SOCIAL_STUDIES_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SS5",
    "course_description": "Geography 2",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SS6",
    "course_description": "Micro Economics",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SS7",
    "course_description": "World History 1",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "Pathfit 2",
    "course_description": "Exercise-Based Fitness Activities",
    "units": 2
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "SS10",
    "course_description": "World History 2",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "SS11",
    "course_description": "Asian Studies",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "SS12",
    "course_description": "Socio-Cultural Anthropology",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFit 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TTL 2",
    "course_description": "Technology for Teaching and Learning 2*",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "SS17",
    "course_description": "Law Related Studies",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "SS18",
    "course_description": "Integrative Methods in Teaching Social Science Discipline in Basic Education",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "SS19",
    "course_description": "Production of Social Studies Instructional Materials",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "SS20",
    "course_description": "Assessment and Evaluation in the Social Science",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "Elective 1",
    "course_description": "Social Networking for Social Integration",
    "units": 3
  },
  {
    "source_program_code": "SS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship*",
    "units": 6
  }
];

export const ACP_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AGRI CROPS 4",
    "course_description": "Field Crops and Cereal Productrion Management",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AGRI CROPS 5",
    "course_description": "Irrigation and Drainage",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "TLE 2",
    "course_description": "Home Economics and Literacy",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "TLE 3",
    "course_description": "Teaching ICT as an Exploratory Course",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-Based Fitness Activites",
    "units": 2
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program 2",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching:The Learner-Centered Approaches with Emphasis on Trainers Methodology 1",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership with focus on the Philippine TVET System",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 4",
    "course_description": "Introduction to Agriculture and Fisheries",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 5",
    "course_description": "Entrepreneurship",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2 with focus on Trainers Methodology I & II",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AGRI CROPS 8",
    "course_description": "Agricultural Mechanics I",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AGRI CROPS 9",
    "course_description": "Agricultural Crops Production Management",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 6",
    "course_description": "Teaching the Common Competence in 1A",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFit 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AGRI CROPS 7TTL 2",
    "course_description": "Technology for Teaching and Learning 2",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AC 2",
    "course_description": "Technology Research 2",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 8",
    "course_description": "Teaching the Common Competencies in ICT",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 9",
    "course_description": "Teaching the Common Competencies in AFA",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 10",
    "course_description": "Supervised Industrial Training",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AGRI CROPS 13",
    "course_description": "Crop Protection",
    "units": 3
  },
  {
    "source_program_code": "ACP",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship*",
    "units": 6
  }
];

export const FSM_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "EDUC 101",
    "course_description": "Child and Adolescent Learners & Learning Principles",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "FSM 4",
    "course_description": "Food Processing, Packaging and Labeling",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "FSM 5",
    "course_description": "Basic Baking",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "TLE 2",
    "course_description": "Home Economics and Literacy",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "TLE 3",
    "course_description": "Teaching ICT as an Exploratory Course",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PATHFIT 2",
    "course_description": "Exercise-Based Fitness Activites",
    "units": 2
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Service Training Program 2",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Arts and Humanities",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 104",
    "course_description": "Facilitating Learner-Centered Teaching:The Learner-Centered Approaches with Emphasis on Trainers Methodology 1",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 105",
    "course_description": "The Teacher and the Community, School Culture and Organizational Leadership with focus on the Philippine TVET System",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 4",
    "course_description": "Introduction to Agriculture and Fisheries",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 5",
    "course_description": "Entrepreneurship",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "EDUC 106",
    "course_description": "Assessment in Learning 2 with focus on Trainers Methodology I & II",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "FSM 8",
    "course_description": "Quantity Cookery",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "FSM 9",
    "course_description": "Advbanced Baking",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "TLE 6",
    "course_description": "Teaching the Common Competence in 1A",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PATHFit 4",
    "course_description": "Sports",
    "units": 2
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "HUM 3",
    "course_description": "Art Appreciation",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "EDUC 110",
    "course_description": "Building and Enhancing New Literacies Across the Curriculum with Emphasis on the 21st Centrury Skills",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "FSM 7 TTL 2",
    "course_description": "Technology for Teacing and Learning 2",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AC 2",
    "course_description": "Technology Research 2",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 8",
    "course_description": "Teaching the Common Competencies in ICT",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 9",
    "course_description": "Teaching the Common Competencies in AFA",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "TLE 10",
    "course_description": "Supervised Industrial Training",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "FSM  13",
    "course_description": "Cafeteria and Catering Management",
    "units": 3
  },
  {
    "source_program_code": "FSM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "4th Year",
    "course_code": "EDUC 111",
    "course_description": "Teaching Internship*",
    "units": 6
  }
];

export const BSAIS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "GE 4",
    "course_description": "Readings in Philippine History",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "GE 5",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 3",
    "course_description": "Conceptual Framework and Accounting Standards",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 4",
    "course_description": "Cost Accounting and Control",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 5",
    "course_description": "Law on Obligations and contracts",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 6",
    "course_description": "Economic Development",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PE 2",
    "course_description": "Fitness Exercise for Specific Sports",
    "units": 2
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 2",
    "course_description": "National Srvice Training Program",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE Elec 1",
    "course_description": "BUSINESS LOGIC",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 12",
    "course_description": "Introduction Accounting Information System",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 13",
    "course_description": "Intermediate Accounting 2",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 14",
    "course_description": "Business Taxation",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 15",
    "course_description": "Regulatory Framework and Legal Issues in Business",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 16",
    "course_description": "Financial Management",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 17",
    "course_description": "Management Science",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PE 4",
    "course_description": "Phusical Activities Towards Health and Fitness Sports",
    "units": 2
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "Ge Elec2",
    "course_description": "Social Science and Philisophy",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC 3",
    "course_description": "Managing Information and Technology",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC 4",
    "course_description": "Information System Operations and Maintenance",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC 5",
    "course_description": "Information Security and Management",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 22",
    "course_description": "Statistical Analysis with Software Application",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 23",
    "course_description": "International Business and Trade",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 24",
    "course_description": "Governance, Business Ethics. Risk Managemetn",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC Elec 1",
    "course_description": "Financial Modelling",
    "units": 3
  },
  {
    "source_program_code": "BSAIS",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "GE 9",
    "course_description": "Art Appreciation",
    "units": 3
  }
];

export const BSMA_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "GE 4",
    "course_description": "",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "GE 5",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 3",
    "course_description": "Purposive Communication",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AE 4",
    "course_description": "Laws and Obligations and Contacts",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "CBME 1",
    "course_description": "Operations Management and TQM",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PE 2",
    "course_description": "Fitness Exercise for Specific Sports",
    "units": 2
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "NSTP 1",
    "course_description": "National Srvice Training Program",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE Elec1",
    "course_description": "Business Logic",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 10",
    "course_description": "Management Science",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 11",
    "course_description": "Regulatory Framework and Legal Issues in Business",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 12",
    "course_description": "Conceptual Frameworks and Accounting Standards",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "Intemediate Accounting 2",
    "course_description": "Business Tax",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 14",
    "course_description": "Financial Markets",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "AE 15",
    "course_description": "Economic Development",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PE 4",
    "course_description": "Phusical Activities Towards Health and Fitness Sports",
    "units": 2
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "Ge Elec2",
    "course_description": "Social Science and Philisophy",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 20",
    "course_description": "Statistical Analysis with Software Application",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 21",
    "course_description": "International Business and Trade",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 22",
    "course_description": "Governance, Business Ethics, Risk Management",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "AE 23",
    "course_description": "Accounting Information System",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "Ae 24",
    "course_description": "Strategic Business Analysis",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC 4",
    "course_description": "Project Management",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "PC 5",
    "course_description": "Strategic Tax Management",
    "units": 3
  },
  {
    "source_program_code": "BSMA",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "3rd Year",
    "course_code": "GE 9",
    "course_description": "Art Appreciation",
    "units": 3
  }
];

export const CRIMINOLOGY_SECOND_SEMESTER_AY_2025_2026_OFFERINGS: CourseOfferingSeed[] = [
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 1",
    "course_description": "Readings in the Philippine History",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "SOC SCI 2",
    "course_description": "Science, Technology and Society",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "AdGE",
    "course_description": "General Chemistry (Organic)",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "Criminology 2",
    "course_description": "CRIMINOLOGY",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "CDI 2",
    "course_description": "Specialized Crime Invesetigation 1 with Legal Medicine",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "CLJ 2",
    "course_description": "Human Rights Education",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "PE 2",
    "course_description": "Arnis and Disarming Technique",
    "units": 2
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "1st Year",
    "course_code": "ROTC 2",
    "course_description": "Theoriues of Crime Causation",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "GE ELEC 3",
    "course_description": "Reserve Officers Training Corps",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "LEA 2",
    "course_description": "Comparative Models in Policing",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "CDI 3",
    "course_description": "Specialized Crime Investigation 2 with Simulation on Interrogation and Interview",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "CLJ 4",
    "course_description": "Great Books",
    "units": 4
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "Criminology 4",
    "course_description": "Professional Conduct and Ethical Standards",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "CA 1",
    "course_description": "Institutional Corrections",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "Forensic 1",
    "course_description": "Forensic Photography",
    "units": 3
  },
  {
    "source_program_code": "CRIM",
    "academic_year": "2025-2026",
    "semester": "2nd Semester",
    "year_level": "2nd Year",
    "course_code": "PE 4",
    "course_description": "Fundamentals of Markmanship",
    "units": 2
  }
];

export const SECOND_SEMESTER_AY_2025_2026_OFFERINGS_BY_PROGRAM: Record<string, CourseOfferingSeed[]> = {
  BEED: BEED_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  ENGLISH: ENGLISH_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  FILIPINO: FILIPINO_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  MATH: MATHEMATICS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  SS: SOCIAL_STUDIES_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  ACP: ACP_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  FSM: FSM_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  BSAIS: BSAIS_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  BSMA: BSMA_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
  CRIM: CRIMINOLOGY_SECOND_SEMESTER_AY_2025_2026_OFFERINGS,
};
