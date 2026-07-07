"use server";

import { handleChangePasswordAction, type ChangePasswordState } from "@/lib/auth/password";

export async function changeAdminPasswordAction(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  return handleChangePasswordAction("admin", "/admin/account", formData);
}
