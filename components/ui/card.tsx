import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn("rounded-lg border border-slateui-border bg-white p-5 shadow-sm", className)}
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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-slateui-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-slateui-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
