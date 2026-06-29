function LoadingBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slateui-surfaceAlt ${className}`} />;
}

export function PortalLoading({ title = "Loading page" }: { title?: string }) {
  return (
    <div className="space-y-6" aria-label={title} aria-live="polite">
      <div className="rounded-lg border border-slateui-border bg-white p-5">
        <LoadingBlock className="h-5 w-48" />
        <LoadingBlock className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
        <LoadingBlock className="h-28" />
      </div>
      <div className="rounded-lg border border-slateui-border bg-white p-5">
        <LoadingBlock className="h-4 w-full" />
        <LoadingBlock className="mt-3 h-4 w-5/6" />
        <LoadingBlock className="mt-3 h-4 w-2/3" />
      </div>
    </div>
  );
}
