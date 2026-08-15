"use client";

import { usePathname } from "next/navigation";
import type { NavigationItem } from "@/lib/constants/navigation";

const specialSections: Record<string, string> = {
  "/student/enrollment-status": "Enrollment Status",
  "/student/cor": "Registration Form",
  "/admin/encode": "Encode Grades/Schedule"
};

export function PortalSectionHeader({
  portalLabel,
  subtitle,
  navigation
}: {
  portalLabel: string;
  subtitle: string;
  navigation: NavigationItem[];
}) {
  const pathname = usePathname();
  const navigationSection = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )?.label;
  const section = specialSections[pathname] ?? (pathname.includes("/registration") ? "Registration Form" : navigationSection ?? portalLabel);

  return (
    <header className="print-hidden border-b border-slateui-border border-t-4 border-t-secondary-600 bg-white px-4 py-5 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-800">{portalLabel}</p>
      <h1 className="mt-1 text-2xl font-bold text-slateui-text sm:text-3xl">{section}</h1>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slateui-muted">{subtitle}</p>
    </header>
  );
}
