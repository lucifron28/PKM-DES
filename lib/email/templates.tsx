import React from "react";

export function AccountSetupEmail({ setupLink }: { setupLink: string }) {
  return (
    <div>
      <h1>PKM-DES Account Setup</h1>
      <p>Please complete your account setup by setting a password.</p>
      <p>
        <a href={setupLink}>Set up your password</a>
      </p>
      <p>If you did not request this, please ignore this email.</p>
    </div>
  );
}
