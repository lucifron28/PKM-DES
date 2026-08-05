import "server-only";

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

export function EnrollmentDecisionEmail({
  firstName,
  decision,
  academicYear,
  semester,
  statusLink
}: {
  firstName: string;
  decision: "APPROVED" | "REJECTED";
  academicYear: string;
  semester: string;
  statusLink: string;
}) {
  const approved = decision === "APPROVED";

  return (
    <div>
      <h1>PKM-DES Enrollment Update</h1>
      <p>Hello {firstName},</p>
      <p>
        Your Online Enrollment request for AY {academicYear}, {semester} has been{" "}
        {approved ? "approved" : "rejected"} by the Registrar.
      </p>
      <p>
        <a href={statusLink}>View your enrollment status</a>
      </p>
      <p>
        {approved
          ? "Sign in to review your enrollment result and draft registration form."
          : "Sign in to review the enrollment result and any remarks in your student portal."}
      </p>
    </div>
  );
}
