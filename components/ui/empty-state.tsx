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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slateui-border bg-slateui-surfaceAlt px-6 py-12 text-center">
      <FileSearch className="h-10 w-10 text-primary-700" aria-hidden="true" />
      <h2 className="mt-4 text-base font-semibold text-slateui-text">{title}</h2>
      {description ? <p className="mt-2 max-w-xl text-sm text-slateui-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
