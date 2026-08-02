"use client";

import { useActionState } from "react";
import { ClipboardCheck } from "lucide-react";
import { submitEnrollmentAction, type EnrollmentState } from "@/app/student/enrollment/actions";
import type { Student } from "@/types/database";
import type { CourseOffering, StandardLoadSet } from "@/types/database";
import { Button, ButtonLink } from "@/components/ui/button";

const initialState: EnrollmentState = {};

export function EnrollmentForm({
  student,
  activeTerm,
  standardLoad
}: {
  student: Student;
  activeTerm: { academicYear: string; semester: string; label: string };
  standardLoad: {
    loadSet: StandardLoadSet;
    offerings: CourseOffering[];
  };
}) {
  const [state, formAction, pending] = useActionState(submitEnrollmentAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {state.message}
        </div>
      ) : null}
      <section aria-labelledby="recorded-details-heading">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 id="recorded-details-heading" className="text-base font-bold text-slateui-text">Recorded academic details</h2>
          <p className="text-sm text-slateui-muted">Read-only information from your student account.</p>
        </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ["Program", student.programs?.name ?? "Not available"],
          ["Year Level", student.year_level],
          ["Student Type", student.student_type],
          ["Current Academic Year", activeTerm.academicYear],
          ["Current Semester", activeTerm.semester]
        ].map(([label, value]) => (
          <div key={label} className="border border-slateui-border bg-slateui-surfaceAlt p-4">
            <dt className="text-xs font-semibold tracking-wide text-slateui-muted">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slateui-text">{value}</dd>
          </div>
        ))}
      </dl>
      </section>
      <p className="border-l-4 border-sky-500 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
        The system uses the program and year level recorded in your student account.
      </p>
      <p className="border-l-4 border-primary-800 bg-primary-50 px-4 py-3 text-sm leading-6 text-primary-900">
        Current enrollment term: {activeTerm.label}. Additional terms require the official academic calendar.
      </p>
      <section aria-labelledby="standard-load-heading" className="border-t border-slateui-border pt-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h2 id="standard-load-heading" className="text-base font-bold text-slateui-text">Configured standard subject load</h2>
            <p className="text-sm text-slateui-muted">This read-only load comes from the Registrar-approved configuration for your program, term, and year level.</p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-slateui-text">
            {standardLoad.loadSet.expected_course_count} courses - {standardLoad.loadSet.expected_total_units} units
          </p>
        </div>
        <div className="mt-3 overflow-x-auto rounded-md border border-slateui-border">
          <table className="min-w-[36rem] w-full text-left text-sm">
            <thead className="bg-slateui-surfaceAlt text-slateui-text">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Course Code</th>
                <th scope="col" className="px-3 py-2 font-semibold">Course Description</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slateui-border bg-white">
              {standardLoad.offerings.map((offering) => (
                <tr key={offering.id}>
                  <td className="px-3 py-2 font-semibold text-slateui-text">{offering.course_code}</td>
                  <td className="px-3 py-2 text-slateui-secondary">{offering.course_description}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slateui-text">{offering.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="certification-heading" className="border-t border-slateui-border pt-5">
      <h2 id="certification-heading" className="text-base font-bold text-slateui-text">Certification</h2>
      <label className="mt-3 flex gap-3 border border-slateui-border bg-white p-4 text-sm font-medium leading-6 text-slateui-secondary">
        <input name="certified" type="checkbox" className="mt-1 h-4 w-4 rounded border-slateui-border text-primary-800" />
        <span>I certify that the information provided is correct.</span>
      </label>
      <p className="mt-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        Submission of this form does not guarantee official enrollment and is subject to administrative approval.
      </p>
      </section>
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
