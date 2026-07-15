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
    default: "bg-primary-50 text-primary-800",
    warning: "bg-amber-100 text-amber-800",
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800"
  }[tone];

  return (
    <Card className="min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slateui-muted">{label}</p>
          <div className="mt-2 break-words text-2xl font-bold text-slateui-text">{value}</div>
          {helper ? <p className="mt-2 text-sm text-slateui-muted">{helper}</p> : null}
        </div>
        {icon ? (
          <div className={cn("rounded-md p-3", toneClass)} aria-hidden="true">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
