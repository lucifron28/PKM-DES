import { PRIMARY_DEMO_STUDENT, readDemoPreparationConfiguration } from "./demo-preparation-fixtures.mjs";
import {
  createSupabaseAdminClient,
  ensurePrimaryCleanState,
  preflightDemoData,
  resetPrimaryWorkflow
} from "./demo-preparation-utils.mjs";

async function main() {
  const configuration = readDemoPreparationConfiguration();
  const admin = createSupabaseAdminClient(configuration);
  const preflight = await preflightDemoData(admin);

  if (!preflight.student && !preflight.officialRecord) {
    console.log(`No primary demo fixture exists for ${PRIMARY_DEMO_STUDENT.email}; nothing was changed.`);
    return;
  }

  const reset = await resetPrimaryWorkflow(admin, {
    student: preflight.student,
    officialRecord: preflight.officialRecord,
    term: configuration.term
  });
  await ensurePrimaryCleanState(admin, {
    student: preflight.student,
    officialRecord: preflight.officialRecord,
    term: configuration.term
  });

  console.log("PKM-DES PRIMARY DEMO WORKFLOW RESET");
  console.log(`Student: ${PRIMARY_DEMO_STUDENT.email} (${PRIMARY_DEMO_STUDENT.studentIdNumber})`);
  console.log(`Current-term enrollments removed: ${reset.enrollmentCount}`);
  console.log(`Current-term requirements removed: ${reset.requirementCount}`);
  console.log("Signatures: NONE");
  console.log("Current enrollment: NONE");
  console.log("Demo student is ready to submit a normal enrollment.");
}

main().catch((error) => {
  console.error(`Demo workflow reset stopped: ${error.message}`);
  process.exitCode = 1;
});
