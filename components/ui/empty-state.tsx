import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slateui-border bg-slateui-surfaceAlt/60 px-6 py-14 text-center backdrop-blur-xs">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-800 ring-8 ring-primary-50/50">
        <FileSearch className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-lg font-bold text-slateui-text sm:text-xl">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-6 text-slateui-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
