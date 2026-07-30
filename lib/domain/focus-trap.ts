/**
 * Focus-trap keyboard handler for mobile navigation panels.
 * Pure logic extracted from PortalNavigation — testable without DOM.
 *
 * The caller is responsible for resolving DOM state into a FocusTrapContext
 * and for executing the returned focus action on the real elements.
 */

export type FocusTrapContext = {
  /** Index of the currently focused element within focusables, or -1. */
  activeElementIndex: number;
  /** Whether the container element itself is focused. */
  isActiveElementOnContainer: boolean;
  /** Whether focus is outside the container entirely. */
  isActiveElementOutside: boolean;
  /** Total number of focusable elements in the trap. */
  focusableCount: number;
};

export type FocusTarget = {
  focus: () => void;
};

export type ScrollLockBody = {
  style: {
    overflow: string;
  };
};

export function lockBodyScroll(body: ScrollLockBody) {
  const previousOverflow = body.style.overflow;
  body.style.overflow = "hidden";

  return () => {
    body.style.overflow = previousOverflow;
  };
}

export function focusFirstControl(focusables: ArrayLike<FocusTarget>, fallback: FocusTarget) {
  if (focusables.length > 0) {
    focusables[0].focus();
    return;
  }

  fallback.focus();
}

export function restoreFocus(target: FocusTarget | null | undefined) {
  target?.focus();
}

/**
 * Returns:
 *   - "CLOSE" when Escape is pressed
 *   - A zero-based index into focusables when focus should move
 *   - null when no focus change is needed
 */
export function resolveFocusTrapAction(
  key: string,
  shiftKey: boolean,
  ctx: FocusTrapContext
): number | "CLOSE" | null {
  if (key === "Escape") return "CLOSE";

  if (key !== "Tab") return null;

  if (ctx.focusableCount === 0) return null;

  if (shiftKey) {
    if (
      ctx.isActiveElementOnContainer ||
      ctx.isActiveElementOutside ||
      ctx.activeElementIndex <= 0
    ) {
      return ctx.focusableCount - 1; // wrap to last
    }
    return ctx.activeElementIndex - 1; // previous
  }

  if (ctx.activeElementIndex >= ctx.focusableCount - 1) {
    return 0; // wrap to first
  }
  return ctx.activeElementIndex + 1; // next
}
