"use client";

import { useActionState } from "react";
import { ClipboardCheck } from "lucide-react";
import { submitEnrollmentAction, type EnrollmentState } from "@/app/student/enrollment/actions";
import { CURRENT_ENROLLMENT_TERM } from "@/lib/constants/pkm";
import type { Student } from "@/types/database";
import { Button, ButtonLink } from "@/components/ui/button";

const initialState: EnrollmentState = {};

export function EnrollmentForm({ student }: { student: Student }) {
  const [state, formAction, pending] = useActionState(submitEnrollmentAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.message}
        </div>
      ) : null}
      <dl className="grid gap-4 sm:grid-cols-2">
        {[
          ["Program", student.programs?.name ?? "Not available"],
          ["Year Level", student.year_level],
          ["Student Type", student.student_type],
          ["Current Academic Year", CURRENT_ENROLLMENT_TERM.academicYear],
          ["Current Semester", CURRENT_ENROLLMENT_TERM.semester]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slateui-border bg-slateui-surfaceAlt p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slateui-muted">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slateui-text">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-slateui-secondary">
        The system uses the program and year level recorded in your student account.
      </p>
      <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900">
        Current enrollment term: {CURRENT_ENROLLMENT_TERM.label}. Additional terms require the official academic calendar.
      </p>
      <label className="flex gap-3 rounded-md border border-slateui-border bg-white p-4 text-sm font-medium text-slateui-secondary">
        <input name="certified" type="checkbox" className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800" />
        <span>I certify that the information provided is correct.</span>
      </label>
      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Submission of this form does not guarantee official enrollment and is subject to administrative approval.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" disabled={pending}>
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
          {pending ? "Submitting..." : "Submit Enrollment"}
        </Button>
        <ButtonLink href="/student/dashboard" variant="outline">
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
