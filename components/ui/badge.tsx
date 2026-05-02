import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral" | "brand";

const tones: Record<BadgeTone, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-800",
  error: "bg-red-100 text-red-700",
  info: "bg-sky-100 text-sky-800",
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-secondary-100 text-slateui-text"
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
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
