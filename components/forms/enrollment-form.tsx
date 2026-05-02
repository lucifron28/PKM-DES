"use client";

import { useActionState } from "react";
import { ClipboardCheck } from "lucide-react";
import { submitEnrollmentAction, type EnrollmentState } from "@/app/student/enrollment/actions";
import { ACADEMIC_YEAR_OPTIONS, SEMESTERS, YEAR_LEVELS } from "@/lib/constants/pkm";
import type { Student } from "@/types/database";
import { Button, ButtonLink } from "@/components/ui/button";
import { SelectInput } from "@/components/ui/field";

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
      <input type="hidden" name="program_id" value={student.program_id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput label="Program" name="program_display" defaultValue={student.programs?.name ?? "Accounting Information System"} disabled>
          <option>{student.programs?.name ?? "Accounting Information System"}</option>
        </SelectInput>
        <SelectInput label="Year Level" name="year_level" defaultValue={student.year_level} required>
          {YEAR_LEVELS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectInput>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput label="Academic Year" name="academic_year" defaultValue="" required>
          <option value="" disabled>
            Select academic year
          </option>
          {ACADEMIC_YEAR_OPTIONS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectInput>
        <SelectInput label="Semester" name="semester" defaultValue="" required>
          <option value="" disabled>
            Select semester
          </option>
          {SEMESTERS.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </SelectInput>
      </div>
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
