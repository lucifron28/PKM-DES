/**
 * Module resolution hook for PortalNavigation test stubs.
 * Redirects child component and framework imports to test stubs
 * ONLY when the importing module path matches.
 *
 * Usage: node --import ./tests/support/stub-loader.mjs <test-file>
 */
import { resolve, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stubDir = resolve(__dirname, "stubs");

// Map of [parentFileSuffix, requestedSpecifier] -> stubFilePath
const overrides = [
  ["portal-navigation.tsx", "./logout-button", resolve(stubDir, "logout-button.tsx")],
  ["portal-navigation.tsx", "./pkm-mark", resolve(stubDir, "pkm-mark.tsx")],
  ["portal-navigation.tsx", "./side-nav", resolve(stubDir, "side-nav.tsx")],
  ["enrollment-review-controls.tsx", "@/app/admin/enrollments/actions", resolve(stubDir, "enrollment-review-actions.ts")],
  ["enrollment-review-controls.tsx", "@/components/requirements/requirement-status-card", resolve(stubDir, "requirement-status-card.tsx")],
  [".tsx", "next/link", resolve(stubDir, "next-link.tsx")],
  [".tsx", "next/navigation", resolve(stubDir, "next-navigation.tsx")],
  [".tsx", "lucide-react", resolve(stubDir, "lucide-react.tsx")],
];

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  const parentFile = normalize(parent?.filename ?? "");
  for (const [fromSuffix, specifier, stubPath] of overrides) {
    if (parentFile.endsWith(fromSuffix) && request === specifier) {
      return origResolve.call(this, stubPath, parent, isMain);
    }
  }
  return origResolve.call(this, request, parent, isMain);
};
