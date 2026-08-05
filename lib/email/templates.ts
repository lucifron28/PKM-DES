type EmailContent = {
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character] ?? character);
}

export function createAccountSetupEmail(setupLink: string): EmailContent {
  const safeLink = escapeHtml(setupLink);

  return {
    html: `<h1>PKM-DES Account Setup</h1><p>Please complete your account setup by setting a password.</p><p><a href="${safeLink}">Set up your password</a></p><p>If you did not request this, please ignore this email.</p>`,
    text: `PKM-DES Account Setup\n\nPlease complete your account setup by setting a password.\n\nSet up your password: ${setupLink}\n\nIf you did not request this, please ignore this email.`
  };
}

export function createEnrollmentDecisionEmail({
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
}): EmailContent {
  const approved = decision === "APPROVED";
  const safeFirstName = escapeHtml(firstName);
  const safeAcademicYear = escapeHtml(academicYear);
  const safeSemester = escapeHtml(semester);
  const safeLink = escapeHtml(statusLink);
  const decisionText = approved ? "approved" : "rejected";
  const followUp = approved
    ? "Sign in to review your enrollment result and draft registration form."
    : "Sign in to review the enrollment result and any remarks in your student portal.";

  return {
    html: `<h1>PKM-DES Enrollment Update</h1><p>Hello ${safeFirstName},</p><p>Your Online Enrollment request for AY ${safeAcademicYear}, ${safeSemester} has been ${decisionText} by the Registrar.</p><p><a href="${safeLink}">View your enrollment status</a></p><p>${followUp}</p>`,
    text: `PKM-DES Enrollment Update\n\nHello ${firstName},\n\nYour Online Enrollment request for AY ${academicYear}, ${semester} has been ${decisionText} by the Registrar.\n\nView your enrollment status: ${statusLink}\n\n${followUp}`
  };
}
