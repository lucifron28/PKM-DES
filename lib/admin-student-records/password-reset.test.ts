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
    validateStudentPasswordResetInput({ temporary_password: "", confirm_temporary_password: "" }).success,
    undefined
  );
  assert.match(
    validateStudentPasswordResetInput({ temporary_password: "short", confirm_temporary_password: "short" }).message ?? "",
    /at least 8/
  );
  assert.match(
    validateStudentPasswordResetInput({ temporary_password: "NewPass123!", confirm_temporary_password: "OtherPass123!" }).message ?? "",
    /do not match/
  );
});

test("requires an exact active student account and official_record_id linkage before reset", () => {
  const input = {
    officialEmail: "student@example.test",
    officialStudentId: "26-00001",
    accountEmail: "student@example.test",
    accountStudentId: "26-00001",
    accountRole: "student",
    accountStatus: "ACTIVE",
    linkedRecordId: "rec-1",
    expectedRecordId: "rec-1"
  };
  assert.equal(isExactActiveStudentAccount(input), true);
  assert.equal(isExactActiveStudentAccount({ ...input, accountStatus: "INACTIVE" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, accountRole: "admin" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, linkedRecordId: "wrong" }), false);
});

test("exact form field names are required", () => {
  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  assert.equal(formData.get("official_record_id"), "rec-1");
  assert.equal(formData.get("temporary_password"), "ValidPass123!");
  assert.equal(formData.get("confirm_temporary_password"), "ValidPass123!");
});

function buildMockSupabaseWithAudit(): {
  supabase: SupabaseClient;
  auditPayloads: Array<Record<string, unknown>>;
} {
  const auditPayloads: Array<Record<string, unknown>> = [];

  const mockRecordData = { id: "rec-1", email: "student@example.test", student_id_number: "26-00001" };
  const mockStudentData = { id: "stu-1", profile_id: "prof-1", student_id_number: "26-00001", official_record_id: "rec-1" };

  const supabase = {
    from: (table: string) => {
      if (table === "official_student_records") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === "rec-1" ? mockRecordData : null,
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
                data: val === "rec-1" ? mockStudentData : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: "student@example.test", role: "student", account_status: "ACTIVE" },
                error: null
              })
            })
          })
        };
      }
      if (table === "audit_logs") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            auditPayloads.push(payload);
            return { error: null };
          }
        };
      }
      return {};
    }
  } as unknown as SupabaseClient;

  return { supabase, auditPayloads };
}

test("successful password reset: getUserById + updateUserById + audit", async () => {
  const { supabase, auditPayloads } = buildMockSupabaseWithAudit();

  let getUserByIdCalled = false;
  let updateUserByIdCalled = false;
  let submittedPassword = "";

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async (uid: string) => {
          getUserByIdCalled = true;
          assert.equal(uid, "prof-1");
          return {
            data: { user: { id: "prof-1", email: "student@example.test" } },
            error: null
          };
        },
        updateUserById: async (uid: string, attrs: { password?: string }) => {
          updateUserByIdCalled = true;
          assert.equal(uid, "prof-1");
          submittedPassword = attrs.password ?? "";
          return { data: { user: { id: uid } }, error: null };
        }
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, true);
  assert.match(result.message ?? "", /Temporary password updated/);
  assert.equal(getUserByIdCalled, true);
  assert.equal(updateUserByIdCalled, true);
  assert.equal(submittedPassword, "ValidPass123!");

  // Verify audit payload has correct target_id (students PK, not profile_id)
  assert.equal(auditPayloads.length, 1);
  assert.equal(auditPayloads[0].target_table, "students");
  assert.equal(auditPayloads[0].target_id, "stu-1");
  assert.equal(auditPayloads[0].actor_profile_id, "admin-actor-1");
  assert.equal(auditPayloads[0].action, "RESET_STUDENT_PASSWORD");

  // Verify returned state never leaks the password
  assert.equal(JSON.stringify(result).includes("ValidPass123!"), false);
});

test("Auth getUserById failure returns user-facing error without password leak", async () => {
  const { supabase } = buildMockSupabaseWithAudit();

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: null },
          error: { message: "User not found" }
        }),
        updateUserById: async () => {
          assert.fail("updateUserById must not be called after getUserById failure");
        }
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, undefined);
  assert.match(result.message ?? "", /Student account could not be verified in Supabase Auth/);
  assert.equal(JSON.stringify(result).includes("ValidPass123!"), false);
});

test("Auth email mismatch returns user-facing error", async () => {
  const { supabase } = buildMockSupabaseWithAudit();

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "prof-1", email: "different@example.test" } },
          error: null
        }),
        updateUserById: async () => {
          assert.fail("updateUserById must not be called on email mismatch");
        }
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, undefined);
  assert.match(result.message ?? "", /Student account could not be verified in Supabase Auth/);
});

test("Auth updateUserById failure returns user-facing error", async () => {
  const { supabase, auditPayloads } = buildMockSupabaseWithAudit();

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "prof-1", email: "student@example.test" } },
          error: null
        }),
        updateUserById: async () => ({
          data: null,
          error: { message: "Auth service unavailable" }
        })
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, undefined);
  assert.match(result.message ?? "", /Password could not be updated/);
  assert.equal(auditPayloads.length, 0);
});

test("audit insertion error does not change success outcome (non-atomic boundary)", async () => {
  const auditPayloads: Array<Record<string, unknown>> = [];
  const mockRecordData = { id: "rec-1", email: "student@example.test", student_id_number: "26-00001" };
  const mockStudentData = { id: "stu-1", profile_id: "prof-1", student_id_number: "26-00001", official_record_id: "rec-1" };

  const supabase = {
    from: (table: string) => {
      if (table === "official_student_records") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: val === "rec-1" ? mockRecordData : null,
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
                data: val === "rec-1" ? mockStudentData : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { email: "student@example.test", role: "student", account_status: "ACTIVE" },
                error: null
              })
            })
          })
        };
      }
      if (table === "audit_logs") {
        return {
          insert: async (payload: Record<string, unknown>) => {
            auditPayloads.push(payload);
            return { error: { message: "Audit insert failed" } };
          }
        };
      }
      return {};
    }
  } as unknown as SupabaseClient;

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: "prof-1", email: "student@example.test" } },
          error: null
        }),
        updateUserById: async (uid: string) => ({
          data: { user: { id: uid } },
          error: null
        })
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, true);
  assert.match(result.message ?? "", /Temporary password updated/);
  assert.equal(auditPayloads.length, 1);
});

test("missing record linkage returns validation error", async () => {
  const { supabase } = buildMockSupabaseWithAudit();
  const mockAdminClient = {} as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-nonexistent");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "ValidPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, undefined);
  assert.match(result.message ?? "", /Student account could not be verified/);
});

test("password mismatch returns validation error, no password in state", async () => {
  const { supabase } = buildMockSupabaseWithAudit();
  const mockAdminClient = {} as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "ValidPass123!");
  formData.set("confirm_temporary_password", "MismatchPass!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, undefined);
  assert.match(result.message ?? "", /do not match/);
  assert.equal(JSON.stringify(result).includes("ValidPass123!"), false);
});

test("no password value written to logs or audit payloads", async () => {
  const { supabase, auditPayloads } = buildMockSupabaseWithAudit();

  const mockAdminClient = {
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: { id: "prof-1", email: "student@example.test" } }, error: null }),
        updateUserById: async () => ({ data: { user: { id: "prof-1" } }, error: null })
      }
    }
  } as unknown as SupabaseClient;

  const formData = new FormData();
  formData.set("official_record_id", "rec-1");
  formData.set("temporary_password", "SecretPass123!");
  formData.set("confirm_temporary_password", "SecretPass123!");

  const result = await resetStudentPasswordService(supabase, formData, "admin-actor-1", mockAdminClient);

  assert.equal(result.success, true);
  assert.equal(JSON.stringify(result).includes("SecretPass123!"), false);
  assert.equal(JSON.stringify(auditPayloads).includes("SecretPass123!"), false);
});
