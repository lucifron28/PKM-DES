"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { NavigationItem } from "@/lib/constants/navigation";
import { buttonClassName } from "@/components/ui/button";
import { LogoutButton } from "./logout-button";
import { PkmMark } from "./pkm-mark";
import { SideNav } from "./side-nav";

export function PortalNavigation({
  navigation,
  portalLabel,
  userName,
  userRole
}: {
  navigation: NavigationItem[];
  portalLabel: string;
  userName: string;
  userRole: string;
}) {
  const [open, setOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isFirstRender = useRef(true);
  const navigationLabel = `${portalLabel} navigation`;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      if (event.key === "Tab" && open && mobileNavRef.current) {
        const focusables = mobileNavRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      requestAnimationFrame(() => {
        mobileNavRef.current?.focus();
      });
    } else {
      document.body.style.overflow = "";
      menuButtonRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slateui-border bg-white lg:flex" aria-label={`${portalLabel} sidebar`}>
        <div className="border-b border-primary-100 px-5 py-5">
          <div className="flex items-center gap-3">
            <PkmMark />
            <div className="min-w-0">
              <p className="font-bold text-slateui-text">PKM-DES</p>
              <p className="truncate text-xs font-semibold text-primary-800">{portalLabel}</p>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5"><SideNav items={navigation} label={navigationLabel} /></div>
        <div className="border-t border-slateui-border p-4">
          <p className="truncate text-sm font-semibold text-slateui-text">{userName}</p>
          <p className="mt-0.5 text-xs text-slateui-muted">{userRole}</p>
          <div className="mt-3"><LogoutButton /></div>
        </div>
      </aside>
      <header className="print-hidden border-b border-primary-100 bg-white lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <PkmMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slateui-text">PKM-DES</p>
              <p className="truncate text-xs text-slateui-muted">{portalLabel}</p>
            </div>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className={buttonClassName("ghost", "min-h-11 px-3")}
            aria-expanded={open}
            aria-controls="portal-mobile-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            <span>{open ? "Close navigation" : "Open navigation"}</span>
          </button>
        </div>
        {open ? (
          <div
            id="portal-mobile-navigation"
            ref={mobileNavRef}
            tabIndex={-1}
            className="border-t border-slateui-border bg-slateui-background px-4 py-4 sm:px-6 focus:outline-none"
          >
            <SideNav items={navigation} label={navigationLabel} onNavigate={() => setOpen(false)} />
            <div className="mt-4 border-t border-slateui-border pt-4">
              <p className="text-sm font-semibold text-slateui-text">{userName}</p>
              <p className="text-xs text-slateui-muted">{userRole}</p>
              <div className="mt-3"><LogoutButton /></div>
            </div>
          </div>
        ) : null}
      </header>
    </>
  );
}
