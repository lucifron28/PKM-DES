"use client";

import { useActionState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import type { DemoResetState } from "@/app/admin/account/actions";

type DemoResetAction = (previousState: DemoResetState, formData: FormData) => Promise<DemoResetState>;

export function DemoResetCard({
  action,
  enabled,
  canReset,
  reason,
  confirmationPhrase
}: {
  action: DemoResetAction;
  enabled: boolean;
  canReset: boolean;
  reason: string;
  confirmationPhrase: string;
}) {
  const [state, formAction, pending] = useActionState(action, {} as DemoResetState);

  return (
    <Card className="border-2 border-dashed border-amber-400 bg-amber-50/60" aria-labelledby="demo-reset-title">
      <CardHeader
        title="Demo data reset"
        description="Use this only when preparing the fictional demonstration workflow again."
      />
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-100 p-4 text-sm leading-6 text-amber-950" role="note">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p id="demo-reset-title" className="font-bold uppercase tracking-wide">DEMO ONLY — destructive reset</p>
            <p className="mt-1">
              This removes student accounts, student records, enrollments, requirements, signatures, and official student records from the explicitly configured demo database. Registrar and staff accounts remain.
            </p>
          </div>
        </div>

        {!canReset ? (
          <p className="text-sm font-semibold text-slateui-secondary" role="status">
            Only the Registrar/Admin account can use this control.
          </p>
        ) : !enabled ? (
          <p className="text-sm font-semibold text-slateui-secondary" role="status">
            {reason}
          </p>
        ) : (
          <form action={formAction} className="space-y-3">
            <label htmlFor="demo-reset-confirmation" className="block text-sm font-semibold text-slateui-text">
              Type <span className="font-mono text-primary-900">{confirmationPhrase}</span> to continue
            </label>
            <input
              id="demo-reset-confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              spellCheck={false}
              className="min-h-11 w-full rounded-md border border-amber-400 bg-white px-3 py-2 font-mono text-sm text-slateui-text outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              aria-describedby="demo-reset-help"
              required
            />
            <p id="demo-reset-help" className="text-xs leading-5 text-slateui-muted">
              The server checks the environment, account role, database target, and confirmation phrase before anything is removed.
            </p>
            <Button type="submit" variant="danger" disabled={pending}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {pending ? "Resetting demo data..." : "Reset Demo Data"}
            </Button>
          </form>
        )}

        {state.message ? (
          <div className={state.success ? "rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800" : "rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"} role={state.success ? "status" : "alert"}>
            <p>{state.message}</p>
            {state.report ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-medium">
                <li>{state.report.student_account_count} student accounts removed</li>
                <li>{state.report.student_record_count} student records removed</li>
                <li>{state.report.enrollment_count} enrollments and {state.report.signature_count} signatures removed</li>
                <li>{state.report.official_record_count} official student records removed</li>
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
