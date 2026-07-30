import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import React, { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { NavigationItem } from "@/lib/constants/navigation";

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
  globals.HTMLAnchorElement = window.HTMLAnchorElement;
  globals.HTMLButtonElement = window.HTMLButtonElement;
  globals.KeyboardEvent = window.KeyboardEvent;
  globals.requestAnimationFrame = (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  };
  globals.cancelAnimationFrame = () => undefined;

  return { dom, body: window.document.body, document: window.document };
}

async function renderPortalNavigation(container: HTMLElement): Promise<Root> {
  const { PortalNavigation } = await import("./portal-navigation");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(PortalNavigation, {
        navigation: [
          { label: "Dashboard", href: "/student/dashboard", icon: "dashboard" },
          { label: "Enrollment", href: "/student/enrollment", icon: "enrollment" }
        ] as NavigationItem[],
        portalLabel: "Student",
        userName: "Test User",
        userRole: "student"
      })
    );
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

test("PortalNavigation handles rendered open, focus wrap, Escape, and close behavior", async () => {
  const { dom, body, document } = await setupDom();
  body.style.overflow = "scroll";
  const container = document.createElement("div");
  body.appendChild(container);
  const root = await renderPortalNavigation(container);

  const menuButton = container.querySelector<HTMLButtonElement>(
    'button[aria-controls="portal-mobile-navigation"]'
  );
  assert.ok(menuButton);
  assert.equal(menuButton.textContent, "Open navigation");

  await act(async () => {
    menuButton.click();
  });

  const panel = container.querySelector<HTMLElement>("#portal-mobile-navigation");
  assert.ok(panel);
  const firstLink = panel.querySelector<HTMLAnchorElement>('[data-testid="nav-link-0"]');
  const lastControl = panel.querySelector<HTMLButtonElement>('[data-testid="logout-button"]');
  assert.ok(firstLink);
  assert.ok(lastControl);
  assert.equal(body.style.overflow, "hidden");
  assert.equal(document.activeElement, firstLink);

  lastControl.focus();
  await act(async () => dispatchKey(dom, "Tab"));
  assert.equal(document.activeElement, firstLink);

  firstLink.focus();
  await act(async () => dispatchKey(dom, "Tab", true));
  assert.equal(document.activeElement, lastControl);

  await act(async () => dispatchKey(dom, "Escape"));
  assert.equal(container.querySelector("#portal-mobile-navigation"), null);
  assert.equal(body.style.overflow, "scroll");
  assert.equal(document.activeElement, menuButton);

  await act(async () => root.unmount());
  dom.window.close();
});

test("PortalNavigation restores body overflow when unmounted while open", async () => {
  const { dom, body, document } = await setupDom();
  body.style.overflow = "auto";
  const container = document.createElement("div");
  body.appendChild(container);
  const root = await renderPortalNavigation(container);
  const menuButton = container.querySelector<HTMLButtonElement>(
    'button[aria-controls="portal-mobile-navigation"]'
  );
  assert.ok(menuButton);

  await act(async () => menuButton.click());
  assert.equal(body.style.overflow, "hidden");

  await act(async () => root.unmount());
  assert.equal(body.style.overflow, "auto");
  dom.window.close();
});
