"use client";

import { useActionState } from "react";
import { setupAccountAction, type SetupAccountState } from "./actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";

const initialState: SetupAccountState = {};

export function SetupAccountForm() {
  const [state, action, pending] = useActionState(setupAccountAction, initialState);

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {state.message}
        </div>
      )}
      <TextInput
        id="password"
        name="password"
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
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Set Password & Complete Setup"}
      </Button>
    </form>
  );
}
