"use client";

import { useState } from "react";
import { createIrregularEnrollmentAction } from "@/app/admin/enrollments/load-actions";
import { Button } from "@/components/ui/button";
import type { CourseOffering, Profile, Student } from "@/types/database";

type IrregularStudentOption = Pick<Student, "id" | "student_id_number" | "program_id" | "year_level"> & {
  profiles?: Pick<Profile, "first_name" | "last_name"> | null;
  programs?: { name: string; code: string | null } | null;
};

export function RegistrarIrregularLoadForm({
  students,
  offerings,
  academicYear,
  semester,
  errorMessage
}: {
  students: IrregularStudentOption[];
  offerings: CourseOffering[];
  academicYear: string;
  semester: string;
  errorMessage?: string | null;
}) {
  const [studentId, setStudentId] = useState("");
  const [offeringIds, setOfferingIds] = useState<string[]>([]);
  const student = students.find((item) => item.id === studentId) ?? null;
  const visibleOfferings = student ? offerings.filter((item) => item.program_id === student.program_id) : [];

  function toggleOffering(id: string, checked: boolean) {
    setOfferingIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  }

  return (
    <form action={createIrregularEnrollmentAction} className="space-y-5 rounded-lg border border-slateui-border bg-white p-5">
      {errorMessage ? <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{errorMessage}</p> : null}
      <p className="text-sm text-slateui-secondary">Create a pending Registrar-managed enrollment for the active term. The student and every prior enrollment record remain in the system.</p>
      <p className="text-sm font-semibold text-slateui-text">AY {academicYear} · {semester}</p>
      <label className="block text-sm font-semibold text-slateui-text">
        Irregular student
        <select
          required
          name="student_id"
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value);
            setOfferingIds([]);
          }}
          className="mt-1 block w-full rounded-md border border-slateui-border bg-white px-3 py-2"
        >
          <option value="">Choose a student</option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {[item.student_id_number, item.profiles?.first_name, item.profiles?.last_name].filter(Boolean).join(" · ")} — {item.programs?.code ?? item.programs?.name ?? "Program unavailable"} · {item.year_level}
            </option>
          ))}
        </select>
      </label>
      <fieldset disabled={!student} className="space-y-2">
        <legend className="mb-2 text-sm font-semibold text-slateui-text">Initial subject load</legend>
        {visibleOfferings.length ? visibleOfferings.map((offering) => (
          <label key={offering.id} className="flex items-start gap-3 rounded-md border border-slateui-border p-3 text-sm">
            <input
              type="checkbox"
              name="course_offering_ids"
              value={offering.id}
              checked={offeringIds.includes(offering.id)}
              onChange={(event) => toggleOffering(offering.id, event.target.checked)}
              className="mt-1"
            />
            <span><strong>{offering.course_code}</strong> — {offering.course_description} <span className="text-slateui-muted">({offering.units} units)</span></span>
          </label>
        )) : <p className="text-sm text-slateui-muted">{student ? "No course offerings are configured for this program and term." : "Choose a student to see this term’s course offerings."}</p>}
      </fieldset>
      <Button type="submit" disabled={!student || offeringIds.length === 0}>Create pending enrollment with {offeringIds.length} subject{offeringIds.length === 1 ? "" : "s"}</Button>
    </form>
  );
}
