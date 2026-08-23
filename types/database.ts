export type UserRole = "student" | "admin";
export type OfficialSignerRole = "LIBRARIAN" | "NURSE" | "PROGRAM_CHAIR" | "ACCOUNTANT" | "DEAN";
export type SignerRole = "STUDENT" | OfficialSignerRole;
export type SignatureClearanceType =
  | "STUDENT_ENROLLMENT_SIGNATURE"
  | "LIBRARY_CLEARANCE"
  | "HEALTH_CLEARANCE"
  | "PROGRAM_CLEARANCE"
  | "ACCOUNTING_CLEARANCE"
  | "DEAN_CLEARANCE";
export type SignatureDocumentType = "ENROLLMENT_REGISTRATION" | "ENROLLMENT_CLEARANCE" | "HEALTH_RECORD";
export type EnrollmentClearanceStatus = "PENDING" | "SIGNED" | "NOT_APPLICABLE" | "INVALIDATED";
export type AccountStatus = "ACTIVE" | "PENDING" | "SETUP";
export type EnrollmentStatus = "NOT ENROLLED" | "PENDING" | "ENROLLED";
export type EnrollmentDecision = "APPROVED" | "REJECTED";
export type EnrollmentReviewStatus = "PENDING" | EnrollmentDecision;
export type EnrollmentDecisionNotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";
export type StandardLoadStatus = "DRAFT" | "ACTIVE";
export type StudentType =
  | "Incoming 1st Year Student"
  | "Transferee"
  | "Old Student"
  | "Continuing Student"
  | "Regular Student"
  | "Irregular Student";

export type YearLevel = "1st Year" | "2nd Year" | "3rd Year" | "4th Year";
export type Semester = "1st Semester" | "2nd Semester";

export type Profile = {
  id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  email: string;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type OfficialRoleAssignment = {
  id: string;
  profile_id: string;
  official_role: OfficialSignerRole;
  program_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Program = {
  id: string;
  name: string;
  code: string | null;
  created_at: string;
};

export type Student = {
  id: string;
  profile_id: string;
  official_record_id?: string | null;
  student_id_number: string | null;
  program_id: string;
  year_level: YearLevel;
  student_type: StudentType;
  enrollment_status: EnrollmentStatus;
  created_at: string;
  updated_at: string;
  programs?: Program | null;
  profiles?: Profile | null;
  official_student_records?: OfficialStudentRecord | null;
};

export type Subject = {
  id: string;
  program_id: string;
  course_code: string;
  course_description: string;
  units: number;
  year_level: YearLevel;
  semester: Semester;
  created_at: string;
  programs?: Program | null;
};

export type CourseOffering = {
  id: string;
  program_id: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  course_code: string;
  course_description: string;
  units: number;
  source_document: string;
  created_at: string;
  updated_at: string;
  programs?: Program | null;
};

export type StandardLoadSet = {
  id: string;
  program_id: string;
  academic_year: string;
  semester: Semester;
  year_level: YearLevel;
  status: StandardLoadStatus;
  expected_course_count: number;
  expected_total_units: number;
  source_document: string;
  created_at: string;
  updated_at: string;
  programs?: Program | null;
};

export type EnrollmentSubject = {
  id: string;
  enrollment_id: string;
  subject_id: string | null;
  course_offering_id: string | null;
  course_code: string;
  course_description: string;
  units: number;
  subjects?: Subject | null;
  course_offerings?: CourseOffering | null;
};

export type Enrollment = {
  id: string;
  student_id: string;
  program_id: string;
  year_level: YearLevel;
  academic_year: string;
  semester: Semester;
  status: EnrollmentReviewStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  remarks: string | null;
  students?: Student | null;
  programs?: Program | null;
  enrollment_subjects?: EnrollmentSubject[] | null;
  enrollment_clearances?: EnrollmentClearance[] | null;
  enrollment_signatures?: EnrollmentSignature[] | null;
};

export type EnrollmentClearance = {
  id: string;
  enrollment_id: string;
  clearance_type: SignatureClearanceType;
  status: EnrollmentClearanceStatus;
  created_at: string;
  updated_at: string;
};

export type EnrollmentSignature = {
  id: string;
  enrollment_id: string;
  student_id: string;
  signer_profile_id: string;
  signer_role: SignerRole;
  clearance_type: SignatureClearanceType;
  document_type: SignatureDocumentType;
  signer_name_snapshot: string;
  signature_storage_path: string;
  signature_hash: string;
  document_hash: string;
  signed_at: string;
  created_at: string;
  updated_at: string;
};

export type SignatureSpecimen = {
  id: string;
  profile_id: string;
  signature_storage_path: string;
  signature_hash: string;
  created_at: string;
  retired_at: string | null;
};

export type NurseHealthRequirementWorkItem = {
  enrollment_id: string;
  enrollment_status: "PENDING" | "APPROVED" | "REJECTED";
  student_id: string;
  student_id_number: string | null;
  student_name: string;
  program_id: string;
  program_name: string;
  year_level: string;
  student_type: string;
  gender_sex: string | null;
  academic_year: string;
  semester: Semester;
  requirement_id: string | null;
  requirement_status: "PENDING" | "VERIFIED" | "REJECTED" | null;
  requirement_applicability: "APPLICABLE" | "NOT_APPLICABLE";
  special_form_required: boolean;
  verified_at: string | null;
  verified_by: string | null;
  nurse_signature_id: string | null;
  nurse_signature_name: string | null;
  nurse_signature_signed_at: string | null;
  nurse_signature_storage_path: string | null;
  nurse_signature_document_hash: string | null;
  nurse_signature_document_type: string | null;
  nurse_signature_is_current: boolean;
};

export type EnrollmentDecisionNotification = {
  id: string;
  enrollment_id: string;
  decision: EnrollmentDecision;
  recipient_email: string;
  academic_year: string;
  semester: Semester;
  status: EnrollmentDecisionNotificationStatus;
  attempt_count: number;
  last_error_code: string | null;
  reserved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};


export type OfficialStudentRecord = {
  id: string;
  student_id_number: string | null;
  first_name: string;
  last_name: string;
  email: string;
  program_id: string;
  year_level: YearLevel;
  student_type: StudentType;
  birthdate: string | null;
  gender_sex: string | null;
  address: string | null;
  contact_number: string | null;
  guardian: string | null;
  emergency_contact_person: string | null;
  nationality: string | null;
  civil_status: string | null;
  previous_school_information: string | null;
  admission_status: string | null;
  enrollment_status: EnrollmentStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  programs?: Program | null;
};
