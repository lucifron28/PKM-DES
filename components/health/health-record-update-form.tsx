"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HealthRecordUpdatePaper } from "@/components/health/health-record-update-paper";
import type { HealthRecordUpdate, HealthRecordUpdateState } from "@/lib/health-records/types";

type HealthRecordUpdateAction = (
  previousState: HealthRecordUpdateState,
  formData: FormData
) => Promise<HealthRecordUpdateState>;

const initialState: HealthRecordUpdateState = {};

export function HealthRecordUpdateForm({
  action,
  enrollmentId,
  studentName,
  program,
  yearLevel,
  dateLabel,
  record,
  studentSignature
}: {
  action: HealthRecordUpdateAction;
  enrollmentId: string;
  studentName: string;
  program: string;
  yearLevel: string;
  dateLabel: string;
  record: HealthRecordUpdate | null;
  studentSignature?: { signerName: string; signedAt: string; signedUrl?: string | null } | null;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="enrollment_id" value={enrollmentId} />
      <HealthRecordUpdatePaper
        studentName={studentName}
        program={program}
        yearLevel={yearLevel}
        dateLabel={dateLabel}
        record={record}
        editable
        studentSignature={studentSignature}
      />
      <div className="print-hidden rounded-md border border-primary-200 bg-primary-50 p-4">
        <p className="text-sm leading-6 text-primary-950">
          Complete the form using the information from your Health Record Update. This information is visible only to you and the assigned School Nurse.
        </p>
        {state.message ? (
          <p role={state.success ? "status" : "alert"} className={`mt-3 text-sm font-semibold ${state.success ? "text-green-800" : "text-red-800"}`}>
            {state.message}
          </p>
        ) : null}
        <Button type="submit" className="mt-4" disabled={pending}>
          {pending ? "Saving..." : "Save Health Record Update"}
        </Button>
      </div>
    </form>
  );
}
