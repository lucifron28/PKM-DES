import assert from "node:assert/strict";
import test from "node:test";
import { enrollmentBadgeTone } from "@/components/ui/badge";

test("enrollment badge tone mapper maps every enrollment review status to correct semantic tones", () => {
  assert.equal(enrollmentBadgeTone("ENROLLED"), "success");
  assert.equal(enrollmentBadgeTone("APPROVED"), "success");
  assert.equal(enrollmentBadgeTone("PENDING"), "warning");
  assert.equal(enrollmentBadgeTone("REJECTED"), "error");
  assert.equal(enrollmentBadgeTone("NOT ENROLLED"), "neutral");
});

test("mobile navigation focus trap logic handles Tab, Shift+Tab, and Escape key contracts", () => {
  const getNextFocusTarget = (
    key: "Tab" | "Escape",
    shiftKey: boolean,
    activeElementIndex: number,
    totalFocusables: number
  ) => {
    if (key === "Escape") return "CLOSE";
    if (key === "Tab") {
      if (shiftKey && activeElementIndex === 0) return totalFocusables - 1; // Wrap to last
      if (!shiftKey && activeElementIndex === totalFocusables - 1) return 0; // Wrap to first
      return shiftKey ? activeElementIndex - 1 : activeElementIndex + 1;
    }
    return activeElementIndex;
  };

  assert.equal(getNextFocusTarget("Escape", false, 1, 5), "CLOSE");
  assert.equal(getNextFocusTarget("Tab", true, 0, 5), 4); // Shift+Tab on first element wraps to last
  assert.equal(getNextFocusTarget("Tab", false, 4, 5), 0); // Tab on last element wraps to first
  assert.equal(getNextFocusTarget("Tab", false, 1, 5), 2); // Regular Tab advances
});
