import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral" | "brand";

const tones: Record<BadgeTone, string> = {
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  brand: "bg-secondary-100 text-slateui-text border-secondary-300"
};

export function Badge({
  children,
  tone = "neutral",
  className
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function enrollmentBadgeTone(status?: string): BadgeTone {
  if (status === "ENROLLED" || status === "APPROVED") {
    return "success";
  }
  if (status === "PENDING") {
    return "warning";
  }
  if (status === "REJECTED") {
    return "error";
  }
  return "neutral";
}
