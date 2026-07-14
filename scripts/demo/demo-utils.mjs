import { createClient } from "@supabase/supabase-js";
import {
  DEMO_PROGRAM_CODE,
  DEMO_RESET_CONFIRMATION,
  DEMO_STUDENT_TYPE,
  DEMO_YEAR_LEVEL,
  resolveDemoTerm
} from "./demo-records.mjs";

export function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function readResetConfiguration(environment = process.env) {
  const url = requireValue("NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireValue("SUPABASE_SERVICE_ROLE_KEY", environment.SUPABASE_SERVICE_ROLE_KEY);
  const password = requireValue("DEMO_STUDENT_PASSWORD", environment.DEMO_STUDENT_PASSWORD);
  const confirmation = requireValue("DEMO_RESET_CONFIRM", environment.DEMO_RESET_CONFIRM);

  if (confirmation !== DEMO_RESET_CONFIRMATION) {
    throw new Error("DEMO_RESET_CONFIRM must equal RESET_PKM_DES_DEMO.");
  }

  return {
    url,
    serviceRoleKey,
    password,
    registrarEmail: environment.DEMO_REGISTRAR_EMAIL?.trim().toLowerCase() || null,
    term: resolveDemoTerm(environment)
  };
}

export function readVerificationConfiguration(environment = process.env) {
  const url = requireValue("NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL);
  const serviceRoleKey = requireValue("SUPABASE_SERVICE_ROLE_KEY", environment.SUPABASE_SERVICE_ROLE_KEY);

  return {
    url,
    serviceRoleKey,
    registrarEmail: environment.DEMO_REGISTRAR_EMAIL?.trim().toLowerCase() || null,
    term: resolveDemoTerm(environment)
  };
}

export function createSupabaseAdminClient({ url, serviceRoleKey }) {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

export function targetHost(url) {
  return new URL(url).host;
}

export function assertNoError(error, action) {
  if (error) {
    throw new Error(`${action}: ${error.message}`);
  }
}

export async function resolveProgramAndSubjects(supabase, term) {
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, code, name")
    .eq("code", DEMO_PROGRAM_CODE)
    .maybeSingle();

  assertNoError(programError, "Could not look up the BSAIS program");

  if (!program) {
    throw new Error(`Program code ${DEMO_PROGRAM_CODE} was not found.`);
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, course_code")
    .eq("program_id", program.id)
    .eq("year_level", DEMO_YEAR_LEVEL)
    .eq("semester", term.semester)
    .order("course_code");

  assertNoError(subjectsError, "Could not look up BSAIS subjects for the demo term");

  if (!subjects?.length) {
    throw new Error(
      `No BSAIS subjects are configured for ${DEMO_YEAR_LEVEL}, ${term.semester}. Demo data was not changed.`
    );
  }

  return { program, subjects };
}

export function createOfficialRecordPayload(record, programId) {
  return {
    student_id_number: record.studentIdNumber,
    first_name: record.firstName,
    last_name: record.lastName,
    email: record.email,
    program_id: programId,
    year_level: DEMO_YEAR_LEVEL,
    student_type: DEMO_STUDENT_TYPE,
    enrollment_status: record.enrollmentStatus
  };
}

export function validateDemoStudentOwnership({ student, profile, authUser, expectedRecord }) {
  if (!student || !profile || !authUser || !expectedRecord) {
    throw new Error("A reserved demo Student ID could not be matched to its exact demo identity.");
  }

  if (!expectedRecord.hasAccount) {
    throw new Error("The claim-only demo Student ID has a student row. Demo data was not changed.");
  }

  const profileEmail = String(profile.email).toLowerCase();
  const authEmail = String(authUser.email).toLowerCase();
  const hasExactMatch =
    student.profile_id === profile.id &&
    profile.id === authUser.id &&
    profileEmail === expectedRecord.email &&
    authEmail === expectedRecord.email &&
    student.student_id_number === expectedRecord.studentIdNumber;

  if (!hasExactMatch) {
    throw new Error("A reserved demo Student ID is linked to a non-demo or mismatched student identity. Demo data was not changed.");
  }

  return true;
}

export function validateExactSubjectSet(expectedSubjectIds, attachedSubjectIds) {
  const expected = [...expectedSubjectIds].sort();
  const attached = [...attachedSubjectIds].sort();
  const uniqueAttached = new Set(attached);

  if (uniqueAttached.size !== attached.length) {
    throw new Error("Duplicate subject attachments were found.");
  }

  if (expected.length !== attached.length) {
    throw new Error(`Expected ${expected.length} attached subjects, found ${attached.length}.`);
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (expected[index] !== attached[index]) {
      throw new Error("Attached subjects do not exactly match the configured demo subject set.");
    }
  }

  return attached.length;
}

export function calculateDashboardCounts(enrollments) {
  return enrollments.reduce(
    (counts, enrollment) => {
      if (enrollment.status === "PENDING") counts.pending += 1;
      if (enrollment.status === "APPROVED") counts.approved += 1;
      if (enrollment.status === "REJECTED") counts.rejected += 1;
      counts.total += 1;
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0, total: 0 }
  );
}

export async function resolveOptionalReviewerId(supabase, registrarEmail) {
  if (!registrarEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", registrarEmail)
    .eq("role", "admin")
    .maybeSingle();
  assertNoError(error, "Could not look up the optional demo reviewer");

  return data?.id ?? null;
}

export function printDemoPlan({ host, term, subjectCount }) {
  console.log(`Target Supabase host: ${host}`);
  console.log(`Demo term: AY ${term.academicYear}, ${term.semester}`);
  console.log(`Matching BSAIS subjects: ${subjectCount}`);
  console.log("Fictional records: claim-only, pending, approved, rejected");
}
