"use client";

import { useState } from "react";
import {
  setIrregularEnrollmentOfferingsAction,
  updatePendingEnrollmentScheduleAction
} from "@/app/admin/enrollments/load-actions";
import { Button } from "@/components/ui/button";
import type { CourseOffering, EnrollmentSubject, StudentType } from "@/types/database";

type EditableSubject = Pick<EnrollmentSubject, "id" | "course_offering_id" | "course_code" | "course_description" | "units" | "day" | "time" | "room">;

export function EnrollmentLoadEditor({
  enrollmentId,
  status,
  studentType,
  subjects,
  offerings,
  notice
}: {
  enrollmentId: string;
  status: string;
  studentType: StudentType;
  subjects: EditableSubject[];
  offerings: CourseOffering[];
  notice?: string | null;
}) {
  const [schedule, setSchedule] = useState(subjects.map((subject) => ({
    id: subject.id,
    units: subject.units,
    day: subject.day ?? "",
    time: subject.time ?? "",
    room: subject.room ?? ""
  })));
  const [offeringIds, setOfferingIds] = useState(subjects
    .map((subject) => subject.course_offering_id)
    .filter((id): id is string => Boolean(id)));
  const [legacySubjectIds, setLegacySubjectIds] = useState(subjects.filter((subject) => !subject.course_offering_id).map((subject) => subject.id));
  const isPending = status === "PENDING";
  const isIrregular = studentType === "Irregular Student";

  function updateSchedule(id: string, field: "units" | "day" | "time" | "room", value: string) {
    setSchedule((current) => current.map((subject) =>
      subject.id === id
        ? { ...subject, [field]: field === "units" ? Number(value) : value }
        : subject
    ));
  }

  function toggleOffering(id: string, checked: boolean) {
    setOfferingIds((current) => checked ? [...current, id] : current.filter((item) => item !== id));
  }

  if (!isPending) {
    return (
      <section className="rounded-lg border border-slateui-border bg-white p-5">
        <h2 className="text-lg font-bold text-slateui-text">Registrar load and schedule</h2>
        <p className="mt-2 text-sm text-slateui-secondary">Approved, rejected, and PULL OUT enrollment contents are read-only. Existing courses, schedules, and signatures remain unchanged.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-lg border border-slateui-border bg-white p-5">
      <div>
        <h2 className="text-lg font-bold text-slateui-text">Registrar load and schedule</h2>
        <p className="mt-1 text-sm text-slateui-secondary">Confirm each course’s units and encode its meeting day, time, and room. These saved values appear on the registration form.</p>
        {notice ? <p role="status" className="mt-3 rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-950">{notice}</p> : null}
      </div>
      <form action={updatePendingEnrollmentScheduleAction} className="space-y-4">
        <input type="hidden" name="enrollment_id" value={enrollmentId} />
        <input type="hidden" name="subjects_json" value={JSON.stringify(schedule)} />
        {subjects.map((subject) => (
          <fieldset key={subject.id} className="grid gap-3 rounded-md border border-slateui-border p-3 sm:grid-cols-2 lg:grid-cols-5">
            <legend className="px-1 text-sm font-semibold text-slateui-text">{subject.course_code} — {subject.course_description}</legend>
            <label className="text-sm text-slateui-secondary">Units
              <input type="number" min={1} max={30} step={1} required value={schedule.find((item) => item.id === subject.id)?.units ?? subject.units} onChange={(event) => updateSchedule(subject.id, "units", event.target.value)} className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
            </label>
            <label className="text-sm text-slateui-secondary">Day
              <input type="text" maxLength={80} value={schedule.find((item) => item.id === subject.id)?.day ?? ""} onChange={(event) => updateSchedule(subject.id, "day", event.target.value)} placeholder="e.g. MWF" className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
            </label>
            <label className="text-sm text-slateui-secondary">Time
              <input type="text" maxLength={80} value={schedule.find((item) => item.id === subject.id)?.time ?? ""} onChange={(event) => updateSchedule(subject.id, "time", event.target.value)} placeholder="e.g. 8:00–9:30 AM" className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
            </label>
            <label className="text-sm text-slateui-secondary">Room
              <input type="text" maxLength={120} value={schedule.find((item) => item.id === subject.id)?.room ?? ""} onChange={(event) => updateSchedule(subject.id, "room", event.target.value)} className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
            </label>
          </fieldset>
        ))}
        <Button type="submit" disabled={schedule.length === 0}>Save units and schedules</Button>
      </form>
      {isIrregular ? (
        <form action={setIrregularEnrollmentOfferingsAction} className="space-y-3 border-t border-slateui-border pt-5">
          <input type="hidden" name="enrollment_id" value={enrollmentId} />
          <input type="hidden" name="legacy_selection_explicit" value="true" />
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-slateui-text">Irregular-student subject assignment</legend>
            <p className="mb-3 text-sm text-slateui-secondary">Select the courses to keep or add. Unchecked courses will be removed when you save. Courses you keep retain their schedules.</p>
            {offerings.map((offering) => (
              <label key={offering.id} className="flex items-start gap-3 rounded-md border border-slateui-border p-3 text-sm">
                <input type="checkbox" name="course_offering_ids" value={offering.id} checked={offeringIds.includes(offering.id)} onChange={(event) => toggleOffering(offering.id, event.target.checked)} className="mt-1" />
                <span><strong>{offering.course_code}</strong> — {offering.course_description} <span className="text-slateui-muted">({offering.units} units)</span></span>
              </label>
            ))}
            {subjects.filter((subject) => !subject.course_offering_id).map((subject) => (
              <label key={subject.id} className="flex items-start gap-3 rounded-md border border-slateui-border p-3 text-sm">
                <input type="checkbox" name="legacy_subject_ids" value={subject.id} checked={legacySubjectIds.includes(subject.id)}
                  onChange={(event) => setLegacySubjectIds((current) => event.target.checked ? [...current, subject.id] : current.filter((id) => id !== subject.id))} className="mt-1" />
                <span><strong>{subject.course_code}</strong> — {subject.course_description} <span className="text-slateui-muted">({subject.units} units, existing course)</span></span>
              </label>
            ))}
          </fieldset>
          <Button type="submit" variant="outline">Save irregular subject assignment</Button>
        </form>
      ) : null}
    </section>
  );
}
