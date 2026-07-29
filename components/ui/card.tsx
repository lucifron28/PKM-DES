import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slateui-border/90 bg-white p-5 shadow-xs transition-shadow duration-200 hover:shadow-sm sm:p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight text-slateui-text sm:text-xl">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slateui-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}
