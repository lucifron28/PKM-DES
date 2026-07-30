import assert from "node:assert/strict";
import test from "node:test";
import { fetchStudentForProfile, fetchStudentQueryResult } from "@/lib/auth/session";
import type { SupabaseClient } from "@supabase/supabase-js";

test("fetchStudentForProfile queries students table by exact profile_id", async () => {
  const mockStudent = {
    id: "student-1",
    profile_id: "profile-123",
    student_id_number: "26-00001",
    program_id: "prog-1",
    year_level: "1st Year",
    student_type: "Incoming 1st Year Student",
    enrollment_status: "NOT ENROLLED"
  };

  const mockSupabase = {
    from: (table: string) => {
      assert.equal(table, "students");
      return {
        select: (cols: string) => {
          assert.match(cols, /program_id|programs/);
          return {
            eq: (col: string, val: string) => {
              assert.equal(col, "profile_id");
              assert.equal(val, "profile-123");
              return {
                maybeSingle: async () => ({ data: mockStudent, error: null })
              };
            }
          };
        }
      };
    }
  } as unknown as SupabaseClient;

  const student = await fetchStudentForProfile(mockSupabase, "profile-123");
  assert.notEqual(student, null);
  assert.equal(student?.id, "student-1");
  assert.equal(student?.profile_id, "profile-123");
});
test("fetchStudentQueryResult distinguishes found, not_found, and query_failed outcomes", async () => {
  const mockStudent = { id: "student-1", profile_id: "p1" };

  const mockFoundClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockStudent, error: null })
        })
      })
    })
  } as unknown as SupabaseClient;

  const mockNotFoundClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      })
    })
  } as unknown as SupabaseClient;

  const mockErrorClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: new Error("Connection failed") })
        })
      })
    })
  } as unknown as SupabaseClient;

  const foundResult = await fetchStudentQueryResult(mockFoundClient, "p1");
  assert.equal(foundResult.status, "found");
  assert.equal(foundResult.student?.id, "student-1");

  const notFoundResult = await fetchStudentQueryResult(mockNotFoundClient, "p-missing");
  assert.equal(notFoundResult.status, "not_found");
  assert.equal(notFoundResult.student, null);

  const errorResult = await fetchStudentQueryResult(mockErrorClient, "p-error");
  assert.equal(errorResult.status, "query_failed");
  assert.equal(errorResult.student, null);
  assert.ok(errorResult.error);
});
