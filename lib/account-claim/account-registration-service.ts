import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailEnvironment } from "@/lib/email";
import {
  cleanupNewRegistration,
  releaseSetupEmailDelivery,
  reserveSetupEmailDelivery,
  type AccountDetails
} from "./repository";
import { sendAccountSetupEmailService } from "./setup-delivery-service";

export type RegistrationResult = {
  success: boolean;
  isEmailSent?: boolean;
};

export async function performStudentRegistrationService(
  admin: SupabaseClient,
  details: AccountDetails,
  emailEnv: EmailEnvironment,
  password?: string
): Promise<RegistrationResult> {
  const isEmailMode = emailEnv.enabled;
  const initialStatus = isEmailMode ? "SETUP" : "ACTIVE";
  const initialPassword = isEmailMode ? crypto.randomUUID() : (password || crypto.randomUUID());

  const { data: createdUser, error: authError } = await admin.auth.admin.createUser({
    email: details.email,
    password: initialPassword,
    email_confirm: true,
    app_metadata: {
      role: "student"
    },
    user_metadata: {
      first_name: details.firstName,
      last_name: details.lastName
    }
  });

  if (authError || !createdUser.user) {
    console.warn("[account-claim] auth_create_failed");
    return { success: false };
  }

  const profileId = createdUser.user.id;
  const { error: profileError } = await admin.from("profiles").insert({
    id: profileId,
    role: "student",
    first_name: details.firstName,
    last_name: details.lastName,
    email: details.email,
    account_status: initialStatus
  });

  if (profileError) {
    console.warn("[account-claim] profile_insert_failed");
    await cleanupNewRegistration(admin, profileId, "profile_insert");
    return { success: false };
  }

  const { error: studentError } = await admin.from("students").insert({
    profile_id: profileId,
    official_record_id: details.officialRecordId,
    student_id_number: details.studentIdNumber,
    program_id: details.programId,
    year_level: details.yearLevel,
    student_type: details.studentType,
    enrollment_status: "NOT ENROLLED"
  });

  if (studentError) {
    console.warn("[account-claim] student_insert_failed");
    await cleanupNewRegistration(admin, profileId, "student_insert");
    return { success: false };
  }

  if (isEmailMode) {
    try {
      if (await reserveSetupEmailDelivery(admin, profileId) !== "reserved") {
        console.warn("[account-claim] setup_email_reservation_rejected");
        await cleanupNewRegistration(admin, profileId, "student_insert");
        return { success: false };
      }
      await sendAccountSetupEmailService(admin, details.email);
      return { success: true, isEmailSent: true };
    } catch {
      console.warn("[account-claim] setup_email_send_failed");
      await releaseSetupEmailDelivery(admin, profileId);
      await cleanupNewRegistration(admin, profileId, "student_insert");
      return { success: false };
    }
  }

  return { success: true, isEmailSent: false };
}
