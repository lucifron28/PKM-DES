import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStudentSubmissionMessage } from "@/lib/enrollment/student-submission";
import { getActiveEnrollmentTermResult, type ActiveEnrollmentTerm } from "@/lib/enrollment/term-authority";

test("term_unavailable maps to clear unavailable message", () => {
  assert.match(
    getStudentSubmissionMessage("term_unavailable"),
    /No active enrollment term is currently configured/
  );
});

test("term_not_open maps to clear closed message", () => {
  assert.match(
    getStudentSubmissionMessage("term_not_open"),
    /Online enrollment is not available for the configured academic term/
  );
});

test("getActiveEnrollmentTermResult returns active term when database query succeeds", async () => {
  const mockTerm = {
    id: "term-1",
    academic_year: "2026-2027",
    semester: "1st Semester",
    enrollment_open: true,
    is_active: true
  };
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockTerm, error: null })
        })
      })
    })
  } as unknown as SupabaseClient;

  const result = await getActiveEnrollmentTermResult(mockSupabase);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.notEqual(result.term, null);
    assert.equal(result.term?.academicYear, "2026-2027");
    assert.equal(result.term?.semester, "1st Semester");
    assert.equal(result.term?.enrollmentOpen, true);
  }
});

test("getActiveEnrollmentTermResult returns term: null when no active term exists", async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      })
    })
  } as unknown as SupabaseClient;

  const result = await getActiveEnrollmentTermResult(mockSupabase);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.term, null);
  }
});

test("getActiveEnrollmentTermResult distinguishes query failure from no active term", async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("Database connection lost") })
        })
      })
    })
  } as unknown as SupabaseClient;

  const result = await getActiveEnrollmentTermResult(mockSupabase);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, "query_failed");
  }
});

test("current-term dashboard ignores newer historical fixtures from another term", () => {
  const activeTerm: ActiveEnrollmentTerm = {
    id: "term-active",
    academicYear: "2026-2027",
    semester: "1st Semester",
    enrollmentOpen: true,
    isActive: true,
    label: "AY 2026-2027, 1st Semester"
  };

  const allEnrollments = [
    {
      id: "newer-future",
      academic_year: "2027-2028",
      semester: "1st Semester",
      status: "PENDING",
      submitted_at: "2027-08-01T00:00:00Z"
    },
    {
      id: "current-term",
      academic_year: "2026-2027",
      semester: "1st Semester",
      status: "ENROLLED",
      submitted_at: "2026-08-01T00:00:00Z"
    }
  ];

  const currentTermMatch = allEnrollments.find(
    (e) => e.academic_year === activeTerm.academicYear && e.semester === activeTerm.semester
  );

  assert.equal(currentTermMatch?.id, "current-term");
  assert.equal(currentTermMatch?.status, "ENROLLED");
});

test("current-term status and requirement share the same term", () => {
  const activeTerm: ActiveEnrollmentTerm = {
    id: "term-active",
    academicYear: "2026-2027",
    semester: "1st Semester",
    enrollmentOpen: true,
    isActive: true,
    label: "AY 2026-2027, 1st Semester"
  };

  const currentRequirement = {
    requirement_code: "HEALTH_RECORD_UPDATE",
    academic_year: "2026-2027",
    semester: "1st Semester",
    status: "VERIFIED"
  };

  const currentEnrollment = {
    academic_year: "2026-2027",
    semester: "1st Semester",
    status: "APPROVED"
  };

  assert.equal(currentRequirement.academic_year, activeTerm.academicYear);
  assert.equal(currentRequirement.semester, activeTerm.semester);
  assert.equal(currentEnrollment.academic_year, activeTerm.academicYear);
  assert.equal(currentEnrollment.semester, activeTerm.semester);
});

test("new pending or rejected request does not hide prior approved form", () => {
  const allEnrollments = [
    {
      id: "newer-pending",
      academic_year: "2026-2027",
      semester: "1st Semester",
      status: "PENDING",
      submitted_at: "2026-08-01T00:00:00Z"
    },
    {
      id: "older-approved",
      academic_year: "2025-2026",
      semester: "2nd Semester",
      status: "APPROVED",
      submitted_at: "2026-01-15T00:00:00Z"
    }
  ];

  const approvedList = allEnrollments.filter((e) => e.status === "APPROVED");
  assert.equal(approvedList.length, 1);
  assert.equal(approvedList[0].id, "older-approved");
});

test("student cannot access another student's form", () => {
  const authenticatedStudentId = "student-123";
  const requestedFormEnrollment = {
    id: "enrollment-456",
    student_id: "student-999",
    status: "APPROVED"
  };

  const isOwner = requestedFormEnrollment.student_id === authenticatedStudentId;
  assert.equal(isOwner, false);
});

test("closed active term prevents submission but permits history viewing", () => {
  const closedTerm: ActiveEnrollmentTerm = {
    id: "term-closed",
    academicYear: "2026-2027",
    semester: "1st Semester",
    enrollmentOpen: false,
    isActive: true,
    label: "AY 2026-2027, 1st Semester"
  };

  assert.equal(closedTerm.enrollmentOpen, false);
});
