import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "@/lib/utils/cn";

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "success" | "danger" | "info";
}) {
  const toneClass = {
    default: "bg-primary-50 text-primary-800 ring-1 ring-primary-200/60",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
    success: "bg-green-50 text-green-700 ring-1 ring-green-200/80",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200/80",
    info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80"
  }[tone];

  return (
    <Card className="group relative min-w-0 overflow-hidden p-5 transition-all duration-200 hover:border-primary-200 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slateui-muted">{label}</p>
          <div className="mt-2.5 break-words text-3xl font-black tracking-tight text-slateui-text tabular-nums sm:text-4xl">{value}</div>
          {helper ? <p className="mt-2 text-xs font-medium leading-5 text-slateui-muted">{helper}</p> : null}
        </div>
        {icon ? (
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-105", toneClass)} aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
