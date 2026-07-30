/**
 * Module resolution hook for PortalNavigation component tests.
 * Redirects child component imports to test stubs.
 * Used via: node --import ./lib/domain/test-hooks.mjs
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "node:module";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const stubDir = resolve(__dirname, "./test-stubs");

const overrides: Record<string, string> = {
  "next/link": resolve(stubDir, "next-link.tsx"),
  "next/navigation": resolve(stubDir, "next-navigation.tsx"),
  "./logout-button": resolve(stubDir, "logout-button.tsx"),
  "./pkm-mark": resolve(stubDir, "pkm-mark.tsx"),
  "./side-nav": resolve(stubDir, "side-nav.tsx"),
};

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, parent: Module | undefined, isMain: boolean) {
  if (request in overrides) {
    return overrides[request];
  }
  if (request.startsWith("@/") && parent?.filename) {
    const resolved = resolve(projectRoot, request.slice(2));
    return origResolve.call(this, resolved, parent, isMain);
  }
  return origResolve.call(this, request, parent, isMain);
};
