"use client";

import { useActionState } from "react";
import { rejectHealthRequirementAction } from "@/app/admin/enrollments/signature-actions";
import type { SignatureActionState } from "@/lib/signatures/action-state";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/field";

const initialState: SignatureActionState = {};

export function HealthRecordRejectionForm({ enrollmentId }: { enrollmentId: string }) {
  const [state, formAction, pending] = useActionState(rejectHealthRequirementAction, initialState);

  return (
    <form action={formAction} className="print-hidden space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <div>
        <h3 className="font-bold text-red-900">Cannot verify this paper-form submission?</h3>
        <p className="mt-1 text-sm leading-6 text-red-900">
          Mark the administrative verification as rejected without drawing or storing a Nurse signature. Do not enter clinical details.
        </p>
      </div>
      <TextArea
        label="Administrative rejection note"
        name="rejection_note"
        placeholder="Optional short status-only note."
        maxLength={240}
      />
      {state.message ? (
        <p role={state.success ? "status" : "alert"} className={state.success ? "text-sm font-semibold text-green-700" : "text-sm font-semibold text-red-800"}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Saving..." : "Mark as Rejected"}
      </Button>
    </form>
  );
}
