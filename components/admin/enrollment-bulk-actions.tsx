"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  bulkReviewEnrollmentsAction,
  pullOutEnrollmentsAction,
  reinstateEnrollmentsAction
} from "@/app/admin/enrollments/actions";
import { Button } from "@/components/ui/button";

type BulkActionMode = "pending" | "pull_out" | "reinstate";

const formIds = {
  review: "bulk-enrollment-review",
  pull_out: "bulk-enrollment-pull-out",
  reinstate: "bulk-enrollment-reinstate"
} as const;

export function EnrollmentBulkActions({
  mode,
  academicYear,
  semester,
  status,
  children
}: {
  mode: BulkActionMode;
  academicYear: string;
  semester: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PULLED_OUT";
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  function selectedInputs() {
    return Array.from(rootRef.current?.querySelectorAll<HTMLInputElement>("input[data-enrollment-select]") ?? []);
  }

  function handleChange(event: ChangeEvent<HTMLDivElement>) {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.matches("input[data-enrollment-select]")) return;
    const checkedInputs = selectedInputs().filter((item) => item.checked);
    if (checkedInputs.length > 100) {
      input.checked = false;
      setNotice("Select no more than 100 enrollments per action.");
      return;
    }
    setSelectedIds(checkedInputs.map((item) => item.value));
    setNotice("");
  }

  function selectAll() {
    const inputs = selectedInputs();
    const ids = inputs.slice(0, 100).map((input) => input.value);
    inputs.forEach((input) => {
      input.checked = ids.includes(input.value);
    });
    setSelectedIds(ids);
    setNotice(inputs.length > 100 ? "Selected the first 100 rows. Submit another batch for the remaining rows." : "");
  }

  function clearSelection() {
    selectedInputs().forEach((input) => {
      input.checked = false;
    });
    setSelectedIds([]);
    setNotice("");
  }

  function confirmBulkAction(event: FormEvent<HTMLFormElement>, actionLabel: string) {
    if (!selectedIds.length) {
      event.preventDefault();
      setNotice("Select at least one enrollment first.");
      return;
    }
    const note = actionLabel === "PULL OUT" ? " Student and enrollment history will be retained." : "";
    if (!window.confirm(`Confirm ${actionLabel} for ${selectedIds.length} selected enrollment${selectedIds.length === 1 ? "" : "s"}?${note}`)) {
      event.preventDefault();
    }
  }

  function confirmReviewAction(event: FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    confirmBulkAction(event, submitter?.value === "REJECTED" ? "reject" : "approve");
  }

  function formContext() {
    return (
      <>
        <input type="hidden" name="academic_year" value={academicYear} />
        <input type="hidden" name="semester" value={semester} />
        <input type="hidden" name="status" value={status} />
        {selectedIds.map((id) => <input key={id} type="hidden" name="enrollment_ids" value={id} />)}
      </>
    );
  }

  return (
    <div ref={rootRef} onChange={handleChange}>
      <section aria-label="Bulk enrollment actions" className="mx-6 mb-4 space-y-3 rounded-md border border-slateui-border bg-slateui-surfaceAlt p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slateui-text" aria-live="polite">{selectedIds.length} selected</span>
          <Button type="button" variant="outline" onClick={selectAll}>Select all shown (up to 100)</Button>
          <Button type="button" variant="outline" onClick={clearSelection} disabled={!selectedIds.length}>Clear selection</Button>
        </div>
        {mode === "pending" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <form id={formIds.review} action={bulkReviewEnrollmentsAction} onSubmit={confirmReviewAction} className="space-y-2 rounded-md border border-slateui-border bg-white p-3">
              {formContext()}
              <label className="block text-sm font-medium text-slateui-text">
                Optional rejection remarks (applied to selected rejections)
                <textarea name="remarks" maxLength={2000} rows={2} className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" name="decision" value="APPROVED" disabled={!selectedIds.length}>Approve selected</Button>
                <Button type="submit" name="decision" value="REJECTED" variant="danger" disabled={!selectedIds.length}>Reject selected</Button>
              </div>
            </form>
            <form id={formIds.pull_out} action={pullOutEnrollmentsAction} onSubmit={(event) => confirmBulkAction(event, "PULL OUT")} className="space-y-2 rounded-md border border-slateui-border bg-white p-3">
              {formContext()}
              <label className="block text-sm font-medium text-slateui-text">
                PULL OUT reason (required)
                <textarea name="reason" required maxLength={2000} rows={2} className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
              </label>
              <Button type="submit" variant="danger" disabled={!selectedIds.length}>PULL OUT selected</Button>
            </form>
          </div>
        ) : mode === "pull_out" ? (
          <form id={formIds.pull_out} action={pullOutEnrollmentsAction} onSubmit={(event) => confirmBulkAction(event, "PULL OUT")} className="space-y-2 rounded-md border border-slateui-border bg-white p-3">
            {formContext()}
            <label className="block text-sm font-medium text-slateui-text">
              PULL OUT reason (required)
              <textarea name="reason" required maxLength={2000} rows={2} className="mt-1 block w-full rounded-md border border-slateui-border px-3 py-2" />
            </label>
            <Button type="submit" variant="danger" disabled={!selectedIds.length}>PULL OUT selected</Button>
          </form>
        ) : (
          <form id={formIds.reinstate} action={reinstateEnrollmentsAction} onSubmit={(event) => confirmBulkAction(event, "reinstate")} className="rounded-md border border-slateui-border bg-white p-3">
            {formContext()}
            <Button type="submit" disabled={!selectedIds.length}>Reinstate selected</Button>
          </form>
        )}
        <p className="text-xs text-slateui-muted">Approvals require current signatures and verified applicable requirements.</p>
        {notice ? <p role="status" className="text-sm font-semibold text-amber-900">{notice}</p> : null}
      </section>
      {children}
    </div>
  );
}

export function EnrollmentSelectionCheckbox({ id, label }: { id: string; label: string }) {
  return (
    <input
      type="checkbox"
      name="enrollment_ids"
      value={id}
      data-enrollment-select
      aria-label={`Select ${label}`}
    />
  );
}
