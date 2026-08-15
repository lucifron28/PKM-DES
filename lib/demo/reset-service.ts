import type { SupabaseClient } from "@supabase/supabase-js";

export type DemoResetReport = {
  student_account_count: number;
  student_record_count: number;
  official_record_count: number;
  enrollment_count: number;
  signature_count: number;
  requirement_count: number;
};

type IdRow = { id: string };
type PathRow = { signature_storage_path: string };

function assertNoError(error: { message: string } | null, message: string): asserts error is null {
  if (error) throw new Error(`${message}: ${error.message}`);
}

async function removeStorageObjects(admin: SupabaseClient, bucket: string, paths: string[]) {
  const uniquePaths = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];

  for (let index = 0; index < uniquePaths.length; index += 100) {
    const { error } = await admin.storage.from(bucket).remove(uniquePaths.slice(index, index + 100));
    assertNoError(error, `Could not remove demo files from ${bucket}`);
  }
}

export async function resetStudentDemoData(admin: SupabaseClient): Promise<DemoResetReport> {
  const { data: profileData, error: profilesError } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "student");
  assertNoError(profilesError, "Could not identify student accounts");

  const profileIds = ((profileData as IdRow[] | null) ?? []).map((row) => row.id);
  const { data: studentData, error: studentsError } = profileIds.length
    ? await admin.from("students").select("id").in("profile_id", profileIds)
    : { data: [], error: null };
  assertNoError(studentsError, "Could not identify student records");

  const studentIds = ((studentData as IdRow[] | null) ?? []).map((row) => row.id);
  const { data: enrollmentData, error: enrollmentsError } = studentIds.length
    ? await admin.from("enrollments").select("id").in("student_id", studentIds)
    : { data: [], error: null };
  assertNoError(enrollmentsError, "Could not identify student enrollments");

  const enrollmentIds = ((enrollmentData as IdRow[] | null) ?? []).map((row) => row.id);
  const [signatureResult, specimenResult] = await Promise.all([
    enrollmentIds.length
      ? admin.from("enrollment_signatures").select("signature_storage_path").in("enrollment_id", enrollmentIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? admin.from("signature_specimens").select("signature_storage_path").in("profile_id", profileIds)
      : Promise.resolve({ data: [], error: null })
  ]);
  assertNoError(signatureResult.error, "Could not identify enrollment signature files");
  assertNoError(specimenResult.error, "Could not identify saved signature specimen files");

  await removeStorageObjects(
    admin,
    "enrollment-signatures",
    ((signatureResult.data as PathRow[] | null) ?? []).map((row) => row.signature_storage_path)
  );
  await removeStorageObjects(
    admin,
    "signature-specimens",
    ((specimenResult.data as PathRow[] | null) ?? []).map((row) => row.signature_storage_path)
  );

  const { data: resetData, error: resetError } = await admin.rpc("reset_demo_student_data");
  assertNoError(resetError, "Could not reset demo student data");

  const report = (Array.isArray(resetData) ? resetData[0] : resetData) as DemoResetReport | null;
  if (!report) throw new Error("The demo reset did not return a reset report.");

  return report;
}
