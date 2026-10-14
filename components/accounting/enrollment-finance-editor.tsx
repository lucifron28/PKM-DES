"use client";

import { useActionState } from "react";
import {
  recordEnrollmentPaymentAction,
  saveEnrollmentAssessmentAction,
  type AccountingActionState
} from "@/app/admin/accounting/actions";
import { isAccountingFeeCode, type AccountingFeeCatalogItem } from "@/lib/finance/fee-codes";
import type { EnrollmentFinancialSummary } from "@/types/database";

const initialState: AccountingActionState = { success: false, message: "" };
const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const dateTime = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" });

function amountLabel(amount: number | null) {
  return amount === null ? "Not recorded" : php.format(amount);
}

function ActionMessage({ state }: { state: AccountingActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-sm ${state.success ? "text-green-800" : "text-red-800"}`} role={state.success ? "status" : "alert"}>{state.message}</p>;
}

export function EnrollmentFinanceEditor({
  enrollmentId,
  summary,
  catalog,
  editable,
  loadError = false
}: {
  enrollmentId: string;
  summary: EnrollmentFinancialSummary | null;
  catalog: AccountingFeeCatalogItem[];
  editable: boolean;
  loadError?: boolean;
}) {
  const [assessmentState, assessmentAction, assessmentPending] = useActionState(saveEnrollmentAssessmentAction, initialState);
  const [paymentState, paymentAction, paymentPending] = useActionState(recordEnrollmentPaymentAction, initialState);
  const previousCodes = new Set(summary?.fee_items?.map((item) => item.fee_code) ?? []);
  const selectableFees = catalog.filter((item) => item.active && item.amount !== null);

  return (
    <section aria-labelledby="enrollment-finance-title" className="space-y-5 rounded-lg border border-slateui-border bg-white p-5">
      <div>
        <h2 id="enrollment-finance-title" className="text-lg font-bold text-slateui-text">Assessment and payments</h2>
        <p className="mt-1 text-sm text-slateui-secondary">Recorded amounts are retained as history. A new assessment or payment requires a fresh accounting clearance signature.</p>
      </div>

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">Financial records could not be loaded safely. Refresh before making changes.</p>
      ) : (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md bg-slateui-surfaceAlt p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Payment status</dt><dd className="mt-1 font-semibold text-slateui-text">{summary?.payment_status ?? "Not available"}</dd></div>
            <div className="rounded-md bg-slateui-surfaceAlt p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Assessed</dt><dd className="mt-1 font-semibold text-slateui-text">{amountLabel(summary?.assessed_amount ?? null)}</dd></div>
            <div className="rounded-md bg-slateui-surfaceAlt p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Paid</dt><dd className="mt-1 font-semibold text-slateui-text">{amountLabel(summary?.paid_amount ?? null)}</dd></div>
            <div className="rounded-md bg-slateui-surfaceAlt p-3"><dt className="text-xs font-bold uppercase tracking-wide text-slateui-muted">Outstanding balance</dt><dd className="mt-1 font-semibold text-slateui-text">{amountLabel(summary?.balance_due ?? null)}</dd></div>
          </dl>

          {summary?.assessment_version ? <p className="text-xs text-slateui-muted">Assessment version {summary.assessment_version}</p> : null}

          <div>
            <h3 className="font-semibold text-slateui-text">Assessed fee items</h3>
            {summary?.fee_items?.length ? (
              <ul className="mt-2 divide-y divide-slateui-border rounded-md border border-slateui-border">
                {summary.fee_items.map((item, index) => (
                  <li key={`${item.fee_code}:${index}`} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                    <span className="text-slateui-text">{item.fee_name}{!isAccountingFeeCode(item.fee_code) ? <span className="ml-2 text-xs text-slateui-muted">{item.fee_code}</span> : null}</span>
                    <span className="font-semibold text-slateui-text">{php.format(item.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slateui-muted">No assessment recorded.</p>}
          </div>

          <div>
            <h3 className="font-semibold text-slateui-text">Payment receipts</h3>
            {summary?.payment_receipts.length ? (
              <div className="mt-2 overflow-x-auto rounded-md border border-slateui-border">
                <table className="min-w-full divide-y divide-slateui-border text-left text-sm">
                  <thead className="bg-slateui-surfaceAlt"><tr><th className="px-3 py-2 font-semibold">Paid at</th><th className="px-3 py-2 font-semibold">Reference</th><th className="px-3 py-2 text-right font-semibold">Amount</th></tr></thead>
                  <tbody className="divide-y divide-slateui-border">
                    {summary.payment_receipts.map((receipt) => <tr key={receipt.payment_id}>
                      <td className="px-3 py-2">{dateTime.format(new Date(receipt.paid_at))}</td>
                      <td className="px-3 py-2">{receipt.reference || "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{php.format(receipt.amount)}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-2 text-sm text-slateui-muted">No payments recorded.</p>}
          </div>

          {editable ? (
            <div className="grid gap-5 border-t border-slateui-border pt-5 lg:grid-cols-2">
              <form action={assessmentAction} className="space-y-3">
                <input type="hidden" name="enrollment_id" value={enrollmentId} />
                <div>
                  <h3 className="font-semibold text-slateui-text">Record a new assessment</h3>
                  <p className="mt-1 text-xs text-slateui-muted">Only active fees with configured amounts can be selected. Previous assessments remain in history.</p>
                </div>
                {selectableFees.length ? selectableFees.map((item) => (
                  <label key={item.fee_code} className="flex items-center justify-between gap-3 rounded-md border border-slateui-border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2 text-slateui-text">
                      <input type="checkbox" name="fee_codes" value={item.fee_code} defaultChecked={previousCodes.has(item.fee_code)} className="size-4 accent-primary-800" />
                      {item.fee_name}
                    </span>
                    <span className="font-semibold text-slateui-text">{php.format(item.amount as number)}</span>
                  </label>
                )) : <p className="text-sm text-slateui-muted">No active configured fees are available yet.</p>}
                <button type="submit" disabled={assessmentPending || selectableFees.length === 0} className="min-h-10 rounded-md bg-primary-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {assessmentPending ? "Saving…" : "Save new assessment"}
                </button>
                <ActionMessage state={assessmentState} />
              </form>

              <form action={paymentAction} className="space-y-3">
                <input type="hidden" name="enrollment_id" value={enrollmentId} />
                <div>
                  <h3 className="font-semibold text-slateui-text">Record a payment</h3>
                  <p className="mt-1 text-xs text-slateui-muted">Enter the receipt amount and optional reference. Payments are retained as individual rows.</p>
                </div>
                <label className="block text-sm font-medium text-slateui-text">Amount (PHP)
                  <input name="amount" required type="number" min="0.01" max="9999999999.99" step="0.01" inputMode="decimal" className="mt-1 block min-h-10 w-full rounded-md border border-slateui-border px-3 py-2 font-normal" />
                </label>
                <label className="block text-sm font-medium text-slateui-text">Receipt reference (optional)
                  <input name="reference" maxLength={120} className="mt-1 block min-h-10 w-full rounded-md border border-slateui-border px-3 py-2 font-normal" />
                </label>
                <button type="submit" disabled={paymentPending} className="min-h-10 rounded-md border border-primary-800 px-4 py-2 text-sm font-bold text-primary-900 disabled:opacity-60">
                  {paymentPending ? "Saving…" : "Record payment"}
                </button>
                <ActionMessage state={paymentState} />
              </form>
            </div>
          ) : <p className="border-t border-slateui-border pt-4 text-sm text-slateui-muted">Financial records are read-only because this enrollment is no longer pending.</p>}
        </>
      )}
    </section>
  );
}
