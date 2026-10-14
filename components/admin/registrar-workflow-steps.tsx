export function RegistrarWorkflowSteps({ status }: { status: string }) {
  const steps = [
    ["Review", "Check the student record and submitted request."],
    ["Load", "Confirm courses, units, meeting days, times, and rooms."],
    ["Clearances", "Collect current signatures and verify applicable requirements."],
    ["Approval", "Approve after all required clearances are complete and current."]
  ] as const;

  return (
    <section aria-labelledby="registrar-workflow-heading" className="rounded-lg border border-primary-200 bg-primary-50 p-4">
      <h2 id="registrar-workflow-heading" className="font-bold text-primary-950">Registrar workflow</h2>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map(([title, description], index) => (
          <li key={title} className="rounded-md border border-primary-100 bg-white p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-700">{index + 1}. {title}</p>
            <p className="mt-1 text-sm leading-5 text-slateui-secondary">{description}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slateui-muted">Current enrollment status: {status}. Approved enrollment contents remain read-only.</p>
    </section>
  );
}
