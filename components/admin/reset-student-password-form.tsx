"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import type { StudentPasswordResetState } from "@/lib/admin-student-records/password-reset";

type ResetStudentPasswordAction = (
  previousState: StudentPasswordResetState,
  formData: FormData
) => Promise<StudentPasswordResetState>;

const initialState: StudentPasswordResetState = {};

export function ResetStudentPasswordForm({
  action,
  officialRecordId
}: {
  action: ResetStudentPasswordAction;
  officialRecordId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="official_record_id" value={officialRecordId} />
      {state.message ? (
        <div
          role="alert"
          className={
            state.success
              ? "border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
              : "border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          }
        >
          {state.message}
        </div>
      ) : null}
      <p className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        Set a temporary password and share it privately with the student. The password is not stored in PKM-DES or displayed again after submission.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          id="temporary_password"
          name="temporary_password"
          label="Temporary Password"
          type="password"
          autoComplete="new-password"
          required
        />
        <TextInput
          id="confirm_temporary_password"
          name="confirm_temporary_password"
          label="Confirm Temporary Password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {pending ? "Resetting..." : "Reset Student Password"}
      </Button>
    </form>
  );
}
