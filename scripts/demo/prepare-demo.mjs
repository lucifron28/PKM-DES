import {
  DEMO_ACCOUNTS,
  PRIMARY_DEMO_STUDENT,
  readDemoPreparationConfiguration
} from "./demo-preparation-fixtures.mjs";
import {
  createSupabaseAdminClient,
  ensureAuthUser,
  ensureOfficialAssignment,
  ensureOfficialStudentRecord,
  ensurePrimaryCleanState,
  ensureProfile,
  ensureStudent,
  preflightDemoData,
  printPreparationPlan,
  printReadinessReport,
  resetPrimaryWorkflow,
  resolveProgramAndSubjects,
  deactivateAllOfficialAssignments
} from "./demo-preparation-utils.mjs";

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  const configuration = readDemoPreparationConfiguration();
  const admin = createSupabaseAdminClient(configuration);
  const { program, subjects } = await resolveProgramAndSubjects(admin, configuration.term);
  const preflight = await preflightDemoData(admin);

  printPreparationPlan(configuration, program, subjects);
  if (isDryRun) {
    console.log("DRY RUN - NO DATA WAS CHANGED");
    return;
  }

  const profilesByKey = new Map();
  for (const account of DEMO_ACCOUNTS) {
    const authUser = await ensureAuthUser(admin, account, configuration.password, preflight.authByEmail);
    preflight.authByEmail.set(account.email, authUser);
    const profile = await ensureProfile(admin, authUser, account);
    profilesByKey.set(account.key, profile);
  }

  for (const account of DEMO_ACCOUNTS) {
    const profile = profilesByKey.get(account.key);
    if (account.officialRole) {
      await ensureOfficialAssignment(admin, profile.id, account.officialRole);
    } else {
      await deactivateAllOfficialAssignments(admin, profile.id);
    }
  }

  await resetPrimaryWorkflow(admin, {
    student: preflight.student,
    officialRecord: preflight.officialRecord,
    term: configuration.term
  });

  const officialRecord = await ensureOfficialStudentRecord(admin, {
    existing: preflight.officialRecord,
    programId: program.id,
    registrarProfileId: profilesByKey.get("registrar").id
  });
  const student = await ensureStudent(admin, {
    existing: preflight.student,
    profileId: profilesByKey.get("student").id,
    officialRecordId: officialRecord.id,
    programId: program.id
  });
  await ensurePrimaryCleanState(admin, { student, officialRecord, term: configuration.term });

  const assignmentCount = DEMO_ACCOUNTS.filter((account) => account.officialRole).length;
  printReadinessReport({
    configuration,
    program,
    subjects,
    accounts: DEMO_ACCOUNTS,
    assignments: assignmentCount,
    primary: {
      officialRecord,
      enrollmentCount: 0,
      requirementCount: 0,
      signatureCount: 0
    }
  });
  console.log(`Primary demo student: ${PRIMARY_DEMO_STUDENT.email} (${PRIMARY_DEMO_STUDENT.studentIdNumber})`);
  console.log(`Auth identities prepared: ${DEMO_ACCOUNTS.length}`);
  console.log(`Active official assignments: ${assignmentCount}`);
}

main().catch((error) => {
  console.error(`Demo preparation stopped: ${error.message}`);
  process.exitCode = 1;
});
