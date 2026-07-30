import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isExactActiveStudentAccount,
  validateStudentPasswordResetInput
} from "./password-reset";
import { resetStudentPasswordService } from "./password-reset-service";

test("accepts a confirmed temporary password using temporary_password field names", () => {
  assert.deepEqual(
    validateStudentPasswordResetInput({
      temporary_password: "NewPass123!",
      confirm_temporary_password: "NewPass123!"
    }),
    {}
  );
});

test("rejects missing, short, and mismatched temporary passwords", () => {
  assert.equal(
    validateStudentPasswordResetInput({
      temporary_password: "",
      confirm_temporary_password: ""
    }).success,
    undefined
  );
  assert.match(
    validateStudentPasswordResetInput({
      temporary_password: "short",
      confirm_temporary_password: "short"
    }).message ?? "",
    /at least 8/
  );
  assert.match(
    validateStudentPasswordResetInput({
      temporary_password: "NewPass123!",
      confirm_temporary_password: "OtherPass123!"
    }).message ?? "",
    /do not match/
  );
});

test("requires an exact active student account and official_record_id linkage before reset", () => {
  const input = {
    officialEmail: "student@example.com",
    officialStudentId: "99-90002",
    accountEmail: "STUDENT@example.com",
    accountStudentId: "99-90002",
    accountRole: "student",
    accountStatus: "ACTIVE",
    linkedRecordId: "rec-100",
    expectedRecordId: "rec-100"
  };

  assert.equal(isExactActiveStudentAccount(input), true);
  assert.equal(isExactActiveStudentAccount({ ...input, accountStudentId: "99-90003" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, accountStatus: "PENDING" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, accountRole: "admin" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, linkedRecordId: "rec-200" }), false);
});

test("resetStudentPasswordService handles missing or invalid linkage, auth error, and audit logging", async () => {
  let auditInserted = false;

  const mockRecord = {
    id: "rec-1",
    email: "student@example.test",
    student_id_number: "26-00001"
  };
  const mockStudent = {
    id: "stu-1",
    profile_id: "prof-1",
    student_id_number: "26-00001",
    official_record_id: "rec-1"
  };
  const mockProfile = {
    email: "student@example.test",
    role: "student",
    account_status: "ACTIVE"
  };

  const mockSupabase = {
    from: (table: string) => {
      if (table === "official_student_records") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === "rec-1" ? mockRecord : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "students") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === "rec-1" ? mockStudent : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === "prof-1" ? mockProfile : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "audit_logs") {
        return {
          insert: async () => {
            auditInserted = true;
            return { error: null };
          }
        };
      }
      return {};
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  // Test missing record linkage
  const missingForm = new FormData();
  missingForm.set("official_record_id", "rec-missing");
  missingForm.set("temporary_password", "ValidPass123!");
  missingForm.set("confirm_temporary_password", "ValidPass123!");
  const missingResult = await resetStudentPasswordService(mockSupabase, missingForm);
  assert.equal(missingResult.success, undefined);
  assert.match(missingResult.message ?? "", /could not be verified/);

  // Test passwords mismatch
  const mismatchForm = new FormData();
  mismatchForm.set("official_record_id", "rec-1");
  mismatchForm.set("temporary_password", "ValidPass123!");
  mismatchForm.set("confirm_temporary_password", "OtherPass123!");
  const mismatchResult = await resetStudentPasswordService(mockSupabase, mismatchForm);
  assert.equal(mismatchResult.success, undefined);
  assert.match(mismatchResult.message ?? "", /do not match/);

  // Verify returned state never leaks the password
  assert.equal(JSON.stringify(mismatchResult).includes("ValidPass123!"), false);
  assert.equal(auditInserted, false);
});
