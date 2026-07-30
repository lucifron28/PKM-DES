import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AccountSetupEmail, getAppBaseUrl, getEmailAdapter } from "@/lib/email";

export async function sendAccountSetupEmailService(
  admin: SupabaseClient,
  email: string
): Promise<void> {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${getAppBaseUrl()}/auth/callback`
    }
  });

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error("generate_link_failed");
  }

  const setupLink = `${getAppBaseUrl()}/auth/callback?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=magiclink`;
  const emailElement = React.createElement(AccountSetupEmail, { setupLink });
  const adapter = getEmailAdapter();

  await adapter.send({
    to: email,
    subject: "PKM-DES Student Account Setup",
    react: emailElement
  });
}
