"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  UserCircle,
  Users,
  WalletCards
} from "lucide-react";
import type { NavigationIcon, NavigationItem } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

const icons: Record<NavigationIcon, typeof BookOpen> = {
  account: UserCircle,
  balances: WalletCards,
  dashboard: LayoutDashboard,
  enrollment: ClipboardCheck,
  grades: GraduationCap,
  masterlist: FileText,
  pending: ListChecks,
  reports: FileText,
  schedule: CalendarDays,
  students: Users,
  subjects: BookOpen
};

export function SideNav({
  items,
  label,
  onNavigate
}: {
  items: NavigationItem[];
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = ["Workflow", "Reference", "Account"] as const;

  return (
    <nav className="space-y-5" aria-label={label}>
      {sections.map((section) => {
        const sectionItems = items.filter((item) => (item.section ?? "Workflow") === section);

        if (!sectionItems.length) {
          return null;
        }

        return (
          <div key={section}>
            <p className="mb-2 px-3 text-xs font-bold tracking-wide text-slateui-muted">{section}</p>
            <div className="space-y-1.5">
              {sectionItems.map((item) => {
                const Icon = icons[item.icon];
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    onFocus={() => router.prefetch(item.href)}
                    onMouseEnter={() => router.prefetch(item.href)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 border-l-4 px-3 py-2 text-sm font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2",
                      active
                        ? "border-secondary-600 bg-primary-50 text-primary-900 shadow-2xs"
                        : "border-transparent text-slateui-secondary hover:bg-primary-50 hover:text-primary-800"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    {item.isStub ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          active ? "bg-secondary-100 text-slateui-text" : "bg-slateui-surfaceAlt text-slateui-muted"
                        )}
                      >
                        Stub
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
