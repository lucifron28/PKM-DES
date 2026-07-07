"use server";

import { handleChangePasswordAction, type ChangePasswordState } from "@/lib/auth/password";

export async function changePasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  return handleChangePasswordAction("student", "/student/account", formData);
}
