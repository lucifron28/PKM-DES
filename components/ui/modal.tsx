"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import {
  focusFirstControl,
  lockBodyScroll,
  resolveFocusTrapAction,
  restoreFocus
} from "@/lib/domain/focus-trap";
import { buttonClassName } from "./button";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  returnFocusRef,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const returnFocusElement = returnFocusRef?.current ?? null;
    const restoreBodyScroll = lockBodyScroll(document.body);

    function getFocusableElements() {
      return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    function handleKeyDown(event: KeyboardEvent) {
      const focusableElements = getFocusableElements();
      const activeElement = document.activeElement as HTMLElement | null;
      const action = resolveFocusTrapAction(event.key, event.shiftKey, {
        activeElementIndex: activeElement ? focusableElements.indexOf(activeElement) : -1,
        isActiveElementOnContainer: activeElement === dialog,
        isActiveElementOutside: !activeElement || !dialog.contains(activeElement),
        focusableCount: focusableElements.length
      });

      if (action === "CLOSE") {
        event.preventDefault();
        onClose();
        return;
      }

      if (typeof action === "number" && focusableElements[action]) {
        event.preventDefault();
        focusableElements[action].focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => {
      focusFirstControl(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR), dialog);
    });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      restoreBodyScroll();
      restoreFocus(returnFocusElement ?? previousActiveElement);
    };
  }, [onClose, open, returnFocusRef]);

  if (!open) return null;

  const titleId = "pkm-modal-title";
  const descriptionId = description ? "pkm-modal-description" : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slateui-border bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slateui-border px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-slateui-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-6 text-slateui-muted">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={buttonClassName("ghost", "shrink-0 px-3")}
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
