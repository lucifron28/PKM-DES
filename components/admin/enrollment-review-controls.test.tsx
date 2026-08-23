import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

type TestDom = {
  dom: JSDOM;
  body: HTMLElement;
  document: Document;
};

async function setupDom(): Promise<TestDom> {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true
  });
  const window = dom.window;
  const globals = globalThis as Record<string, unknown>;

  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globals.React = React;
  globals.window = window;
  globals.document = window.document;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: window.navigator
  });
  globals.HTMLElement = window.HTMLElement;
  globals.HTMLButtonElement = window.HTMLButtonElement;
  globals.KeyboardEvent = window.KeyboardEvent;
  const requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  };
  globals.requestAnimationFrame = requestAnimationFrame;
  globals.cancelAnimationFrame = () => undefined;
  return { dom, body: window.document.body, document: window.document };
}

async function renderControls(container: HTMLElement, customProps: Record<string, unknown> = {}): Promise<Root> {
  const { EnrollmentReviewControls } = await import("./enrollment-review-controls");
  const root = createRoot(container);

  const defaultProps = {
    enrollmentId: "enrollment-1",
    studentName: "Maria Santos",
    studentId: "26-00001",
    email: "maria@example.com",
    program: "Bachelor of Science in Accounting Information Systems",
    yearLevel: "1st Year",
    studentType: "Incoming 1st Year Student",
    academicYear: "2025-2026",
    semester: "2nd Semester",
    submittedAt: "2026-08-05T10:00:00.000Z",
    subjects: [
      { id: "subject-1", course_code: "AIS-101", course_description: "Accounting Systems", units: 3 }
    ],
    healthRequirement: {
      applicability: "APPLICABLE" as const,
      status: "PENDING" as const,
      note: null,
      unavailable: false,
      nurseSignatureStatus: "MISSING" as const,
      nurseSignerName: null,
      nurseSignedAt: null
    },
    clearanceReadiness: {
      allCurrent: false,
      missingLabels: ["Health Clearance"]
    }
  };

  await act(async () => {
    root.render(createElement(EnrollmentReviewControls, { ...defaultProps, ...customProps }));
  });

  return root;
}

function dispatchKey(dom: JSDOM, key: string, shiftKey = false) {
  dom.window.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key,
      shiftKey
    })
  );
}

test("enrollment review opens an accessible modal and restores focus and scroll state", async () => {
  const { dom, body, document } = await setupDom();
  body.style.overflow = "auto";
  const container = document.createElement("div");
  body.appendChild(container);
  let root: Root | undefined;

  try {
    root = await renderControls(container);
    const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
    assert.ok(trigger);

    await act(async () => trigger.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
    assert.ok(dialog);
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.equal(body.style.overflow, "hidden");
    assert.equal(document.activeElement === dialog.querySelector("button"), true, "focus enters the modal");
    assert.match(dialog.textContent ?? "", /Maria Santos/);
    assert.match(dialog.textContent ?? "", /AIS-101/);

    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
    const lastControl = focusable().at(-1);
    assert.ok(lastControl);

    lastControl.focus();
    dispatchKey(dom, "Tab");
    assert.equal(document.activeElement === focusable()[0], true, "Tab wraps to the first modal control");

    focusable()[0].focus();
    dispatchKey(dom, "Tab", true);
    assert.equal(document.activeElement === focusable().at(-1), true, "Shift+Tab wraps to the last modal control");

    await act(async () => dispatchKey(dom, "Escape"));
    assert.equal(container.querySelector('[role="dialog"]'), null);
    assert.equal(body.style.overflow, "auto");
    assert.equal(document.activeElement === trigger, true, "focus returns to the review trigger");

    await act(async () => trigger.click());
    const openDialog = container.querySelector<HTMLElement>('[role="dialog"]');
    assert.ok(openDialog);
    const rejectButton = Array.from(openDialog.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.includes("Reject enrollment"));
    assert.ok(rejectButton);

    await act(async () => rejectButton.click());
    assert.ok(openDialog.querySelector("textarea[name=remarks]"));
    assert.equal(document.activeElement?.textContent, "Reject this enrollment request");
    assert.equal(document.activeElement?.getAttribute("tabindex"), "-1");
    const backButton = Array.from(openDialog.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Back");
    assert.ok(backButton);
    await act(async () => backButton.click());
    assert.equal(openDialog.querySelector("textarea[name=remarks]"), null);
    const returnedRejectButton = Array.from(openDialog.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent?.includes("Reject enrollment"));
    assert.ok(returnedRejectButton);
    assert.equal(document.activeElement === returnedRejectButton, true, "Back returns focus to Reject enrollment");

    assert.ok(container.querySelector('[role="dialog"]'));
    await act(async () => root?.unmount());
    assert.equal(body.style.overflow, "auto");
  } finally {
    root = undefined;
    dom.window.close();
  }
});

test("modal disables Confirm Approval when standard student is missing Nurse signature", async () => {
  const { body, document } = await setupDom();
  const container = document.createElement("div");
  body.appendChild(container);

  const root = await renderControls(container, {
    studentType: "Old Student",
    healthRequirement: {
      applicability: "NOT_APPLICABLE",
      status: "PENDING",
      note: null,
      unavailable: false,
      nurseSignatureStatus: "MISSING",
      nurseSignerName: null,
      nurseSignedAt: null
    },
    clearanceReadiness: {
      allCurrent: false,
      missingLabels: ["Health Clearance"]
    }
  });

  const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
  assert.ok(trigger);
  await act(async () => trigger.click());

  const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.ok(dialog);
  const approveBtn = Array.from(dialog!.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Confirm Approval"));
  assert.ok(approveBtn);
  assert.equal(approveBtn.disabled, true);
  assert.match(dialog!.textContent ?? "", /Nurse Health Clearance signature is missing/i);
  await act(async () => root.unmount());
});

test("modal disables Confirm Approval when special student has Health Record pending", async () => {
  const { body, document } = await setupDom();
  const container = document.createElement("div");
  body.appendChild(container);

  const root = await renderControls(container, {
    healthRequirement: {
      applicability: "APPLICABLE",
      status: "PENDING",
      note: null,
      unavailable: false,
      nurseSignatureStatus: "MISSING",
      nurseSignerName: null,
      nurseSignedAt: null
    },
    clearanceReadiness: {
      allCurrent: false,
      missingLabels: ["Health Clearance"]
    }
  });

  const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
  assert.ok(trigger);
  await act(async () => trigger.click());

  const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.ok(dialog);
  const approveBtn = Array.from(dialog!.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Confirm Approval"));
  assert.ok(approveBtn);
  assert.equal(approveBtn.disabled, true);
  assert.match(dialog!.textContent ?? "", /Health Record Update verification is pending/i);
  await act(async () => root.unmount());
});

test("modal disables Confirm Approval when Nurse is signed but another clearance is incomplete", async () => {
  const { body, document } = await setupDom();
  const container = document.createElement("div");
  body.appendChild(container);

  const root = await renderControls(container, {
    healthRequirement: {
      applicability: "APPLICABLE",
      status: "VERIFIED",
      note: null,
      unavailable: false,
      nurseSignatureStatus: "SIGNED",
      nurseSignerName: "Florence Nurse",
      nurseSignedAt: "2026-08-22T00:00:00.000Z"
    },
    clearanceReadiness: {
      allCurrent: false,
      missingLabels: ["Dean Clearance"]
    }
  });

  const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
  assert.ok(trigger);
  await act(async () => trigger.click());

  const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.ok(dialog);
  const approveBtn = Array.from(dialog!.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Confirm Approval"));
  assert.ok(approveBtn);
  assert.equal(approveBtn.disabled, true);
  assert.match(dialog!.textContent ?? "", /Required clearance signatures are incomplete: Dean Clearance/i);
  await act(async () => root.unmount());
});

test("modal enables Confirm Approval when all required clearances are complete and current", async () => {
  const { body, document } = await setupDom();
  const container = document.createElement("div");
  body.appendChild(container);

  const root = await renderControls(container, {
    healthRequirement: {
      applicability: "APPLICABLE",
      status: "VERIFIED",
      note: null,
      unavailable: false,
      nurseSignatureStatus: "SIGNED",
      nurseSignerName: "Florence Nurse",
      nurseSignedAt: "2026-08-22T00:00:00.000Z"
    },
    clearanceReadiness: {
      allCurrent: true,
      missingLabels: []
    }
  });

  const trigger = container.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]');
  assert.ok(trigger);
  await act(async () => trigger.click());

  const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
  assert.ok(dialog);
  const approveBtn = Array.from(dialog!.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.includes("Confirm Approval"));
  assert.ok(approveBtn);
  assert.equal(approveBtn.disabled, false);
  await act(async () => root.unmount());
});
