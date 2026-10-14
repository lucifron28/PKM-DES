import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { actionCalls } from "../../tests/support/stubs/enrollment-workflow-actions";
import type { CourseOffering } from "@/types/database";

function setupDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='root'></div></body></html>", { url: "http://localhost", pretendToBeVisual: true });
  Object.assign(globalThis, {
    React, IS_REACT_ACT_ENVIRONMENT: true, window: dom.window, document: dom.window.document,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLButtonElement: dom.window.HTMLButtonElement, FormData: dom.window.FormData
  });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  actionCalls.length = 0;
  return { dom, container, root };
}

function button(container: HTMLElement, label: string) {
  const found = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === label);
  assert.ok(found, `Missing button: ${label}`);
  return found;
}

test("bulk select-all caps at 100 and keeps counts and submitted IDs aligned, then clears", async () => {
  const { dom, container, root } = setupDom();
  const { EnrollmentBulkActions, EnrollmentSelectionCheckbox } = await import("./enrollment-bulk-actions");
  const ids = Array.from({ length: 105 }, (_, index) => `enrollment-${index}`);
  try {
    await act(async () => root.render(
      <EnrollmentBulkActions mode="pending" status="PENDING" academicYear="2026-2027" semester="1st Semester">
        {ids.map((id) => <EnrollmentSelectionCheckbox key={id} id={id} label={id} />)}
      </EnrollmentBulkActions>
    ));
    assert.ok(button(container, "Approve selected").disabled);
    await act(async () => button(container, "Select all shown (up to 100)").click());
    assert.equal(container.querySelector('[aria-live="polite"]')?.textContent, "100 selected");
    const checkboxes = Array.from(container.querySelectorAll<HTMLInputElement>("input[data-enrollment-select]"));
    assert.deepEqual(checkboxes.filter((input) => input.checked).map((input) => input.value), ids.slice(0, 100));
    for (const form of container.querySelectorAll("form")) {
      assert.deepEqual(new dom.window.FormData(form).getAll("enrollment_ids"), ids.slice(0, 100));
    }
    await act(async () => checkboxes[100].click());
    assert.equal(checkboxes[100].checked, false);
    assert.equal(container.querySelector('[aria-live="polite"]')?.textContent, "100 selected");
    assert.match(container.querySelector('[role="status"]')?.textContent ?? "", /no more than 100/);
    await act(async () => button(container, "Clear selection").click());
    assert.equal(container.querySelector('[aria-live="polite"]')?.textContent, "0 selected");
    assert.ok(checkboxes.every((input) => !input.checked));
    assert.equal(container.querySelectorAll('input[type="hidden"][name="enrollment_ids"]').length, 0);
    assert.ok(button(container, "Approve selected").disabled);
    assert.ok(button(container, "Clear selection").disabled);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("cancelling bulk rejection prevents the action; confirmation allows it", async () => {
  const { dom, container, root } = setupDom();
  const { EnrollmentBulkActions, EnrollmentSelectionCheckbox } = await import("./enrollment-bulk-actions");
  const prompts: string[] = [];
  let confirmed = false;
  dom.window.confirm = (message) => { prompts.push(message ?? ""); return confirmed; };
  try {
    await act(async () => root.render(
      <EnrollmentBulkActions mode="pending" status="PENDING" academicYear="2026-2027" semester="1st Semester">
        <EnrollmentSelectionCheckbox id="selected-id" label="Selected student" />
      </EnrollmentBulkActions>
    ));
    await act(async () => container.querySelector<HTMLInputElement>("input[data-enrollment-select]")!.click());
    const reject = button(container, "Reject selected");
    const form = reject.form!;
    const cancelled = new dom.window.SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: reject });
    await act(async () => { form.dispatchEvent(cancelled); });
    assert.equal(cancelled.defaultPrevented, true);
    assert.match(prompts[0], /Confirm reject for 1 selected enrollment/);
    assert.deepEqual(actionCalls, []);
    confirmed = true;
    await act(async () => { form.dispatchEvent(new dom.window.SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: reject })); });
    assert.deepEqual(actionCalls, ["review"]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("irregular assignment submits explicitly kept legacy subjects and permits removing all legacy rows", async () => {
  const { dom, container, root } = setupDom();
  const { EnrollmentLoadEditor } = await import("./enrollment-load-editor");
  const subjects = ["keep-legacy", "remove-legacy"].map((id) => ({
    id, course_offering_id: null, course_code: id, course_description: "Existing subject", units: 3,
    day: "MWF", time: "9 AM", room: "101"
  }));
  try {
    await act(async () => root.render(createElement(EnrollmentLoadEditor, {
      enrollmentId: "enrollment", status: "PENDING", studentType: "Irregular Student", subjects, offerings: []
    })));
    const remove = container.querySelector<HTMLInputElement>('input[name="legacy_subject_ids"][value="remove-legacy"]')!;
    const keep = container.querySelector<HTMLInputElement>('input[name="legacy_subject_ids"][value="keep-legacy"]')!;
    const form = keep.form!;
    assert.deepEqual(new dom.window.FormData(form).getAll("legacy_subject_ids"), ["keep-legacy", "remove-legacy"]);
    await act(async () => remove.click());
    assert.deepEqual(new dom.window.FormData(form).getAll("legacy_subject_ids"), ["keep-legacy"]);
    assert.equal(new dom.window.FormData(form).get("legacy_selection_explicit"), "true");
    await act(async () => keep.click());
    assert.deepEqual(new dom.window.FormData(form).getAll("legacy_subject_ids"), []);
    assert.equal(new dom.window.FormData(form).get("legacy_selection_explicit"), "true");
    await act(async () => root.render(createElement(EnrollmentLoadEditor, {
      key: "approved", enrollmentId: "enrollment", status: "APPROVED", studentType: "Irregular Student", subjects, offerings: []
    })));
    assert.equal(container.querySelector("form"), null);
    assert.equal(container.querySelector('input[name="legacy_subject_ids"]'), null);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});

test("load editor keyed remount submits refreshed subject/schedule values without deleted offering IDs", async () => {
  const { dom, container, root } = setupDom();
  const { EnrollmentLoadEditor } = await import("./enrollment-load-editor");
  const offering = (id: string): CourseOffering => ({
    id, program_id: "program", academic_year: "2026-2027", semester: "1st Semester", year_level: "1st Year",
    course_code: id, course_description: "Course description", units: 3, source_document: "catalog",
    created_at: "2026-10-14", updated_at: "2026-10-14"
  });
  const oldSubject = { id: "deleted-subject", course_offering_id: "old-offering", course_code: "OLD", course_description: "Older course", units: 3, day: "MWF", time: "9 AM", room: "101" };
  const savedSubject = { ...oldSubject, id: "new-subject", course_offering_id: "new-offering", course_code: "NEW", course_description: "New course", units: 4, day: "TU", room: "202" };
  const render = (subjects: typeof oldSubject[], offerings: CourseOffering[]) => createElement(EnrollmentLoadEditor, {
    key: JSON.stringify({
      term: ["2026-2027", "1st Semester"], status: "PENDING",
      subjects: subjects.map(({ id, course_offering_id, units, day, time, room }) => [id, course_offering_id, units, day, time, room]),
      offerings: offerings.map((item) => item.id)
    }),
    enrollmentId: "enrollment", status: "PENDING", studentType: "Irregular Student", subjects, offerings
  });
  try {
    await act(async () => root.render(render([oldSubject], [offering("old-offering"), offering("new-offering")])));
    await act(async () => container.querySelector<HTMLInputElement>('input[value="new-offering"]')!.click());
    assert.deepEqual(Array.from(container.querySelectorAll<HTMLInputElement>('input[name="course_offering_ids"]:checked')).map((input) => input.value), ["old-offering", "new-offering"]);
    await act(async () => root.render(render([savedSubject], [offering("new-offering")])));
    const payload = JSON.parse(container.querySelector<HTMLInputElement>('input[name="subjects_json"]')!.value);
    assert.deepEqual(payload, [{ id: "new-subject", units: 4, day: "TU", time: "9 AM", room: "202" }]);
    const assignment = container.querySelector<HTMLInputElement>('input[name="course_offering_ids"]')!.form!;
    assert.deepEqual(new dom.window.FormData(assignment).getAll("course_offering_ids"), ["new-offering"]);
    assert.ok(!container.textContent?.includes("Older course"));
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
  }
});
