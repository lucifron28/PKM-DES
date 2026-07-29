export type StudentPasswordResetState = {
  message?: string;
  success?: boolean;
};

export function validateStudentPasswordResetInput({
  password,
  confirmPassword
}: {
  password: string;
  confirmPassword: string;
}): StudentPasswordResetState {
  if (!password || !confirmPassword) {
    return { message: "Please complete both password fields." };
  }

  if (password.length < 8) {
    return { message: "Temporary password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { message: "Temporary password and confirmation do not match." };
  }

  return {};
}

export function isExactActiveStudentAccount({
  officialEmail,
  officialStudentId,
  accountEmail,
  accountStudentId,
  accountRole,
  accountStatus
}: {
  officialEmail: string;
  officialStudentId: string | null;
  accountEmail: string | null;
  accountStudentId: string | null;
  accountRole: string | null;
  accountStatus: string | null;
}) {
  return Boolean(
    officialStudentId &&
      accountEmail?.trim().toLowerCase() === officialEmail.trim().toLowerCase() &&
      accountStudentId?.trim() === officialStudentId.trim() &&
      accountRole === "student" &&
      accountStatus === "ACTIVE"
  );
}
