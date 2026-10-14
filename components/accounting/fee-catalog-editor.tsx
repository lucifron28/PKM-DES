"use client";

import { useActionState } from "react";
import { configureAccountingFeeAction, type AccountingActionState } from "@/app/admin/accounting/actions";
import type { AccountingFeeCatalogItem, AccountingFeeSection } from "@/lib/finance/fee-codes";

const initialState: AccountingActionState = { success: false, message: "" };
const sections: Array<{ key: AccountingFeeSection; label: string }> = [
  { key: "MISCELLANEOUS", label: "Miscellaneous fees" },
  { key: "TUITION", label: "Tuition" },
  { key: "NSTP", label: "NSTP" },
  { key: "SCHOLARSHIP", label: "Scholarship" }
];

function FeeSetting({ item }: { item: AccountingFeeCatalogItem }) {
  const [state, formAction, pending] = useActionState(configureAccountingFeeAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 border-t border-slateui-border py-4 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
      <input type="hidden" name="fee_code" value={item.fee_code} />
      <div>
        <p className="font-semibold text-slateui-text">{item.fee_name}</p>
        <p className="text-xs text-slateui-muted">{item.active ? "Active for new assessments" : item.amount === null ? "No amount configured" : "Inactive"}</p>
      </div>
      <label className="text-sm font-medium text-slateui-text">
        Amount (PHP)
        <input
          name="amount"
          type="number"
          min="0"
          max="9999999999.99"
          step="0.01"
          inputMode="decimal"
          defaultValue={item.amount === null ? "" : item.amount.toFixed(2)}
          className="mt-1 block min-h-10 w-full rounded-md border border-slateui-border px-3 py-2 font-normal"
        />
      </label>
      <div className="flex items-end gap-3">
        <label className="flex min-h-10 items-center gap-2 text-sm text-slateui-text">
          <input name="active" type="checkbox" defaultChecked={item.active} className="size-4 accent-primary-800" />
          Active
        </label>
        <button type="submit" disabled={pending} className="min-h-10 rounded-md bg-primary-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {state.message ? <p className={`text-sm sm:col-span-3 ${state.success ? "text-green-800" : "text-red-800"}`} role={state.success ? "status" : "alert"}>{state.message}</p> : null}
    </form>
  );
}

export function FeeCatalogEditor({ items, loadError = false }: { items: AccountingFeeCatalogItem[]; loadError?: boolean }) {
  return (
    <section aria-labelledby="accounting-fees-title" className="rounded-lg border border-slateui-border bg-white p-5">
      <h2 id="accounting-fees-title" className="text-lg font-bold text-slateui-text">Configured fees</h2>
      <p className="mt-1 text-sm text-slateui-secondary">Set fee amounts and choose which ones can be added to a new assessment. Unconfigured amounts stay blank.</p>
      {loadError ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">Fee settings could not be loaded. Refresh before making changes.</p>
      ) : sections.map((section) => (
        <div key={section.key} className="mt-5">
          <h3 className="border-b border-slateui-border pb-2 text-sm font-bold uppercase tracking-wide text-slateui-secondary">{section.label}</h3>
          {items.filter((item) => item.section === section.key).map((item) => <FeeSetting key={item.fee_code} item={item} />)}
        </div>
      ))}
    </section>
  );
}
