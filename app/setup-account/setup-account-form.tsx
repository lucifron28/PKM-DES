"use client";

import { useActionState } from "react";
import { setupAccountAction, type SetupAccountState } from "./actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";

const initialState: SetupAccountState = {};

export function SetupAccountForm() {
  const [state, action, pending] = useActionState(setupAccountAction, initialState);
  const isSessionError = state.message?.toLowerCase().includes("session has expired or is invalid");

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 space-y-2">
          <p>{state.message}</p>
          {isSessionError && (
            <div className="pt-1">
              <ButtonLink href="/create-account" variant="outline" className="min-h-9 px-3 py-1.5 text-xs">
                Request New Setup Link
              </ButtonLink>
            </div>
          )}
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
