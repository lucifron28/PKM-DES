import assert from "node:assert/strict";
import test from "node:test";
import { COURSE_OFFERINGS_MANIFEST } from "@/lib/course-offerings/manifest";
import { claimOfficialRecordService } from "@/lib/account-claim/claim-service";
import { addOfficialRecordService } from "@/lib/admin-student-records/official-record-service";
import type { SupabaseClient } from "@supabase/supabase-js";

test("domain services validate missing or incomplete input shapes correctly", async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null })
          })
        })
      })
    })
  } as unknown as SupabaseClient;

  const claimResult = await claimOfficialRecordService({
    admin: mockSupabase,
    claimedStudentType: "Incoming 1st Year Student",
    email: "unknown@example.com",
    studentIdNumber: "00-00000"
  });

  assert.equal(claimResult.success, false);
  assert.match(claimResult.message ?? "", /No matching official student record/);

  const addForm = new FormData();
  const addResult = await addOfficialRecordService(mockSupabase, "admin-id", addForm);

  assert.equal(addResult.success ?? false, false);
  assert.ok(addResult.fieldErrors);
  assert.equal(typeof addResult.fieldErrors?.first_name, "string");
  assert.equal(COURSE_OFFERINGS_MANIFEST.expectedTotalRows, 245);
});
