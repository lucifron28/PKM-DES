import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveEnrollmentTermResult } from "@/lib/enrollment/term-authority";
import { getOfficialWorkspace } from "@/lib/official-roles/roles";
import type {
  EnrollmentClearanceStatus,
  OfficialRoleAssignment,
  OfficialSignerRole,
  NurseHealthRequirementWorkItem,
  Semester
} from "@/types/database";
import { getHealthVerificationViewState, type HealthVerificationViewState } from "@/lib/health-records/presentation";
import type { RequirementStatus } from "@/lib/requirements/types";

export type ClearanceQueueStatus = "PENDING" | "SIGNED" | "INVALIDATED" | "NOT_APPLICABLE" | "REJECTED";
export type ClearanceQueueFilter = "pending" | "verified" | "rejected" | "signed" | "all";

export type OfficialClearanceQueueRow = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string | null;
  programName: string;
  yearLevel: string;
  academicYear: string;
  semester: Semester;
  enrollmentStatus: string;
  clearanceStatus: ClearanceQueueStatus;
  signerName: string | null;
  signedAt: string | null;
  actionable: boolean;
  requirementStatus?: RequirementStatus;
  healthVerificationState?: HealthVerificationViewState;
};

type GenericEnrollmentRow = {
  id: string;
  student_id: string;
  program_id: string;
  year_level: string;
  academic_year: string;
  semester: Semester;
  status: string;
  students?: {
    student_id_number?: string | null;
    profiles?: { first_name?: string | null; last_name?: string | null } | null;
  } | null;
  programs?: { name?: string | null } | null;
  enrollment_clearances?: Array<{ clearance_type: string; status: EnrollmentClearanceStatus }>;
};

type SignatureRow = {
  enrollment_id: string;
  signer_name_snapshot: string;
  signed_at: string;
};

function displayName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Student name unavailable";
}

function filterMatches(row: OfficialClearanceQueueRow, status: ClearanceQueueFilter, search: string) {
  const normalizedSearch = search.trim().toLowerCase();
  const statusMatches = status === "all"
    || ((status === "signed" || status === "verified") && (row.clearanceStatus === "SIGNED" || row.healthVerificationState === "VERIFIED"))
    || (status === "rejected" && (row.clearanceStatus === "REJECTED" || row.healthVerificationState === "REJECTED"))
    || (status === "pending" && (row.clearanceStatus === "PENDING" || row.clearanceStatus === "INVALIDATED" || row.healthVerificationState === "LEGACY_VERIFICATION"));
  if (!statusMatches) return false;
  if (!normalizedSearch) return true;
  return [row.studentName, row.studentIdNumber, row.programName, row.academicYear, row.semester]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

export function filterOfficialClearanceQueue(
  rows: OfficialClearanceQueueRow[],
  status: ClearanceQueueFilter,
  search = ""
) {
  return rows.filter((row) => filterMatches(row, status, search));
}

function currentTermMatches(row: { academic_year: string; semester: Semester }, activeTerm: { academicYear: string; semester: Semester }) {
  return !activeTerm || (row.academic_year === activeTerm.academicYear && row.semester === activeTerm.semester);
}

function assignmentAllowsProgram(
  assignments: ReadonlyArray<Pick<OfficialRoleAssignment, "official_role" | "program_id" | "active">>,
  role: OfficialSignerRole,
  programId: string
) {
  return assignments.some(
    (assignment) =>
      assignment.active &&
      assignment.official_role === role &&
      (assignment.program_id === null || assignment.program_id === programId)
  );
}

async function loadNurseQueue(
  supabase: SupabaseClient,
  role: OfficialSignerRole,
  activeTerm: { academicYear: string; semester: Semester },
  assignments: ReadonlyArray<Pick<OfficialRoleAssignment, "official_role" | "program_id" | "active">>
) {
  const { data, error } = await supabase.rpc("list_nurse_health_requirements");
  if (error) return { rows: [] as OfficialClearanceQueueRow[], error };

  const workItems = (data as NurseHealthRequirementWorkItem[] | null) ?? [];
  const enrollmentIds = workItems.map((item) => item.enrollment_id);
  const contextResponse = enrollmentIds.length
    ? await supabase
        .from("enrollments")
        .select("id, program_id, year_level, programs(name)")
        .in("id", enrollmentIds)
    : { data: [], error: null };
  if (contextResponse.error) return { rows: [] as OfficialClearanceQueueRow[], error: contextResponse.error };

  const contextById = new Map(
    ((contextResponse.data as Array<{ id: string; program_id: string; year_level: string; programs?: { name?: string | null } | null }> | null) ?? [])
      .map((row) => [row.id, row])
  );

  return {
      rows: workItems
      .filter((item) => {
        const context = contextById.get(item.enrollment_id);
        return currentTermMatches(item, activeTerm) && Boolean(context) && assignmentAllowsProgram(assignments, role, context!.program_id);
      })
      .map((item) => {
        const context = contextById.get(item.enrollment_id);
        const healthVerificationState = getHealthVerificationViewState({
          applicability: item.requirement_applicability,
          status: item.requirement_status,
          nurseSignatureIsCurrent: item.nurse_signature_is_current
        });
        const clearanceStatus: ClearanceQueueStatus = healthVerificationState === "REJECTED"
          ? "REJECTED"
          : item.nurse_signature_is_current
            ? "SIGNED"
            : item.nurse_signature_id
              ? "INVALIDATED"
              : "PENDING";
        return {
          enrollmentId: item.enrollment_id,
          studentId: item.student_id,
          studentName: item.student_name || "Student name unavailable",
          studentIdNumber: item.student_id_number,
          programName: context?.programs?.name ?? "Program unavailable",
          yearLevel: context?.year_level ?? "Year level unavailable",
          academicYear: item.academic_year,
          semester: item.semester,
          enrollmentStatus: item.enrollment_status,
          clearanceStatus,
          signerName: item.nurse_signature_name,
          signedAt: item.nurse_signature_signed_at,
          actionable: item.enrollment_status === "PENDING" && healthVerificationState !== "NOT_APPLICABLE" && healthVerificationState !== "VERIFIED",
          requirementStatus: item.requirement_status,
          healthVerificationState
        } satisfies OfficialClearanceQueueRow;
      }),
    error: null
  };
}

export async function loadOfficialClearanceQueue(
  supabase: SupabaseClient,
  role: OfficialSignerRole,
  assignments: ReadonlyArray<Pick<OfficialRoleAssignment, "official_role" | "program_id" | "active">>
) {
  const workspace = getOfficialWorkspace(role);
  const activeTermResult = await getActiveEnrollmentTermResult(supabase);
  if (!activeTermResult.ok) return { rows: [] as OfficialClearanceQueueRow[], error: activeTermResult.error ?? new Error("Active enrollment term unavailable") };
  if (!activeTermResult.term) return { rows: [] as OfficialClearanceQueueRow[], error: null };
  const activeTerm = { academicYear: activeTermResult.term.academicYear, semester: activeTermResult.term.semester };

  if (role === "NURSE") return loadNurseQueue(supabase, role, activeTerm, assignments);

  const { data, error } = await supabase
    .from("enrollments")
    .select("id, student_id, program_id, year_level, academic_year, semester, status, students(student_id_number, profiles(first_name, last_name)), programs(name), enrollment_clearances!inner(clearance_type, status)")
    .in("status", ["PENDING", "APPROVED"])
    .eq("enrollment_clearances.clearance_type", workspace.clearanceType)
    .order("submitted_at", { ascending: true });
  if (error) return { rows: [] as OfficialClearanceQueueRow[], error };

  const enrollmentRows = (data as GenericEnrollmentRow[] | null) ?? [];
  const enrollmentIds = enrollmentRows.map((row) => row.id);
  const signatureResponse = enrollmentIds.length
    ? await supabase
        .from("enrollment_signatures")
        .select("enrollment_id, signer_name_snapshot, signed_at")
        .in("enrollment_id", enrollmentIds)
        .eq("clearance_type", workspace.clearanceType)
        .order("signed_at", { ascending: false })
    : { data: [], error: null };
  if (signatureResponse.error) return { rows: [] as OfficialClearanceQueueRow[], error: signatureResponse.error };

  const latestSignatureByEnrollment = new Map<string, SignatureRow>();
  for (const signature of (signatureResponse.data as SignatureRow[] | null) ?? []) {
    if (!latestSignatureByEnrollment.has(signature.enrollment_id)) latestSignatureByEnrollment.set(signature.enrollment_id, signature);
  }

  return {
    rows: enrollmentRows
      .filter((row) => currentTermMatches(row, activeTerm) && assignmentAllowsProgram(assignments, role, row.program_id))
      .map((row) => {
        const clearance = row.enrollment_clearances?.find((item) => item.clearance_type === workspace.clearanceType);
        const signature = latestSignatureByEnrollment.get(row.id);
        return {
          enrollmentId: row.id,
          studentId: row.student_id,
          studentName: displayName(row.students?.profiles?.first_name, row.students?.profiles?.last_name),
          studentIdNumber: row.students?.student_id_number ?? null,
          programName: row.programs?.name ?? "Program unavailable",
          yearLevel: row.year_level,
          academicYear: row.academic_year,
          semester: row.semester,
          enrollmentStatus: row.status,
          clearanceStatus: clearance?.status ?? "PENDING",
          signerName: signature?.signer_name_snapshot ?? null,
          signedAt: signature?.signed_at ?? null,
          actionable: row.status === "PENDING"
        } satisfies OfficialClearanceQueueRow;
      }),
    error: null
  };
}
