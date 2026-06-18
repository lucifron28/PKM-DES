"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function SideNav({ items }: { items: NavigationItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
              active
                ? "bg-primary-800 text-white"
                : "text-slateui-secondary hover:bg-primary-50 hover:text-primary-800"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
