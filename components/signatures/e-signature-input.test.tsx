import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

function installCanvasMocks(window: { HTMLCanvasElement: { prototype: unknown } }) {
  const context = {
    beginPath() {},
    clearRect() {},
    lineTo() {},
    moveTo() {},
    setTransform() {},
    stroke() {},
    lineCap: "round",
    lineJoin: "round",
    strokeStyle: "#111827",
    lineWidth: 2.4
  } as unknown as CanvasRenderingContext2D;
  const canvasPrototype = window.HTMLCanvasElement.prototype as {
    getContext: () => CanvasRenderingContext2D;
    toDataURL: () => string;
    getBoundingClientRect: () => DOMRect;
    setPointerCapture: () => void;
    hasPointerCapture: () => boolean;
    releasePointerCapture: () => void;
  };

  canvasPrototype.getContext = () => context;
  canvasPrototype.toDataURL = () => "data:image/png;base64,AAAA";
  canvasPrototype.setPointerCapture = () => undefined;
  canvasPrototype.hasPointerCapture = () => false;
  canvasPrototype.releasePointerCapture = () => undefined;
  canvasPrototype.getBoundingClientRect = () => ({
    width: 640,
    height: 176,
    top: 0,
    left: 0,
    right: 640,
    bottom: 176,
    x: 0,
    y: 0,
    toJSON: () => ({})
  }) as DOMRect;
}

async function setup() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
    pretendToBeVisual: true
  });
  const globals = globalThis as Record<string, unknown>;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globals.React = React;
  globals.window = dom.window;
  globals.document = dom.window.document;
  globals.HTMLElement = dom.window.HTMLElement;
  globals.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  globals.FormData = dom.window.FormData;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  installCanvasMocks(dom.window);
  return dom;
}

async function renderSignatureInput(container: HTMLElement, signedSignature?: { isCurrent: boolean }) {
  const { ESignatureInput } = await import("./e-signature-input");
  const root = createRoot(container);
  const action = async () => ({ success: true, message: "saved" });

  await act(async () => {
    root.render(
      createElement(ESignatureInput, {
        action,
        enrollmentId: "enrollment-1",
        signerRole: "NURSE",
        clearanceType: "HEALTH_CLEARANCE",
        signerLabel: "School Nurse",
        signerName: "Ana Dela Cruz",
        signedSignature: signedSignature
          ? {
              signerName: "Ana Dela Cruz",
              signedAt: "2026-08-14T10:00:00.000Z",
              signedUrl: null,
              isCurrent: signedSignature.isCurrent,
              inputType: "DRAWN"
            }
          : null
      })
    );
  });

  return root;
}

function pointerEvent(dom: JSDOM, type: string, clientX: number, clientY: number, pointerId: number) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    clientX: { value: clientX },
    clientY: { value: clientY },
    pointerId: { value: pointerId }
  });
  return event;
}

test("signature input is a real canvas with confirmation and no browser role field", async () => {
  const dom = await setup();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  let root: Root | undefined;

  try {
    root = await renderSignatureInput(container);
    const canvas = container.querySelector<HTMLCanvasElement>("canvas");
    const form = container.querySelector<HTMLFormElement>("form");
    const confirmation = container.querySelector<HTMLInputElement>("input[name=signature_confirmation]");
    const hiddenSignature = container.querySelector<HTMLInputElement>("input[name=signature_data]");
    assert.ok(canvas);
    assert.ok(form);
    assert.ok(confirmation?.required);
    assert.ok(hiddenSignature);
    assert.equal(container.querySelector('input[name="official_role"]'), null);

    await act(async () => {
      form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });
    assert.match(container.textContent ?? "", /Draw a signature before applying it/);

    canvas.focus();
    await act(async () => {
      canvas.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
      form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    });
    assert.match(hiddenSignature.value, /^data:image\/png;base64,/);

    await act(async () => {
      const untouched = new dom.window.Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(untouched);
    });
    assert.match(hiddenSignature.value, /^data:image\/png;base64,/);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});

test("pointer down and a one-pixel mark do not enable signing", async () => {
  const dom = await setup();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  let root: Root | undefined;

  try {
    root = await renderSignatureInput(container);
    const canvas = container.querySelector<HTMLCanvasElement>("canvas");
    const form = container.querySelector<HTMLFormElement>("form");
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    assert.ok(canvas);
    assert.ok(form);
    assert.ok(submit);
    assert.equal(submit.disabled, true);

    await act(async () => {
      canvas.dispatchEvent(pointerEvent(dom, "pointerdown", 10, 10, 1));
      canvas.dispatchEvent(pointerEvent(dom, "pointerup", 10, 10, 1));
    });
    assert.equal(submit.disabled, true);

    await act(async () => {
      canvas.dispatchEvent(pointerEvent(dom, "pointerdown", 10, 10, 2));
      canvas.dispatchEvent(pointerEvent(dom, "pointermove", 11, 10, 2));
      canvas.dispatchEvent(pointerEvent(dom, "pointerup", 11, 10, 2));
    });
    assert.equal(submit.disabled, true);
    await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
    assert.match(container.textContent ?? "", /Draw a signature before applying it/);
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
  }
});

test("current signature evidence replaces the pad with signed status", async () => {
  const dom = await setup();
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  let root: Root | undefined;

  try {
    root = await renderSignatureInput(container, { isCurrent: true });
    assert.equal(container.querySelector("canvas"), null);
    assert.match(container.textContent ?? "", /Electronically signed/);
    assert.match(container.textContent ?? "", /Ana Dela Cruz/);
  } finally {
    await act(async () => {
      root?.unmount();
    });
    dom.window.close();
  }
});
