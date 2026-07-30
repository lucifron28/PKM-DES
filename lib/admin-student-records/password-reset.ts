export type StudentPasswordResetState = {
  message?: string;
  success?: boolean;
};

export function validateStudentPasswordResetInput({
  temporary_password,
  confirm_temporary_password
}: {
  temporary_password: string;
  confirm_temporary_password: string;
}): StudentPasswordResetState {
  if (!temporary_password || !confirm_temporary_password) {
    return { message: "Please complete both password fields." };
  }

  if (temporary_password.length < 8) {
    return { message: "Temporary password must be at least 8 characters." };
  }

  if (temporary_password !== confirm_temporary_password) {
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
  accountStatus,
  linkedRecordId,
  expectedRecordId
}: {
  officialEmail: string;
  officialStudentId: string | null;
  accountEmail: string | null;
  accountStudentId: string | null;
  accountRole: string | null;
  accountStatus: string | null;
  linkedRecordId?: string | null;
  expectedRecordId?: string | null;
}) {
  const linkageValid =
    linkedRecordId === undefined || expectedRecordId === undefined || linkedRecordId === expectedRecordId;

  return Boolean(
    linkageValid &&
      officialStudentId &&
      accountEmail?.trim().toLowerCase() === officialEmail.trim().toLowerCase() &&
      accountStudentId?.trim() === officialStudentId.trim() &&
      accountRole === "student" &&
      accountStatus === "ACTIVE"
  );
}
