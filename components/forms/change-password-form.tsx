"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  changePasswordAction,
  type ChangePasswordState
} from "@/app/student/account/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.message ? (
        <div
          className={
            state.success
              ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
              : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          }
        >
          {state.message}
        </div>
      ) : null}

      <TextInput
        id="current_password"
        name="current_password"
        label="Current Password"
        type="password"
        autoComplete="current-password"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="new_password"
          name="new_password"
          label="New Password"
          type="password"
          autoComplete="new-password"
          required
        />
        <TextInput
          id="confirm_password"
          name="confirm_password"
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        {pending ? "Updating..." : "Update Password"}
      </Button>
    </form>
  );
}
