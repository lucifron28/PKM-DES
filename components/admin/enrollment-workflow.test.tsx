import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { actionCalls } from "../../tests/support/stubs/enrollment-workflow-actions";

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
