export function DetailList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 border-b border-slateui-border pb-3 sm:grid-cols-[220px_1fr]">
          <dt className="font-medium text-slateui-muted">{label}</dt>
          <dd className="font-semibold text-slateui-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
