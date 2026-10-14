import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getStudentQueryResult, requireRole } from "@/lib/auth/session";
import { parseEnrollmentFinancialSummary } from "@/lib/finance/presentation";
import { formatDate } from "@/lib/utils/format";

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const money = (value: number | null) => value === null ? "Not recorded" : php.format(value);

export default async function BalancesPage() {
  const { supabase, profile } = await requireRole("student");
  const student = await getStudentQueryResult(profile.id);
  if (student.status !== "found") return <EmptyState title="Student record unavailable" description="Please refresh or contact the Registrar." />;
  const { data, error } = await supabase.from("enrollments")
    .select("id, academic_year, semester").eq("student_id", student.student.id).order("submitted_at", { ascending: false });
  if (error) return <EmptyState title="Balances could not be loaded" description="Please refresh and try again." />;
  const records = await Promise.all((data ?? []).map(async (enrollment) => {
    const result = await supabase.rpc("get_enrollment_financial_summary", { p_enrollment_id: enrollment.id });
    return { enrollment, summary: result.error ? null : parseEnrollmentFinancialSummary(result.data) };
  }));
  return <div className="space-y-6">
    <Card><CardHeader title="Balances" description="Your recorded assessments, payments, and outstanding balances." />
      {!records.length ? <EmptyState title="No enrollment financial records found." /> : null}
    </Card>
    {records.map(({ enrollment, summary }) => <Card key={enrollment.id}>
      <CardHeader title={`${enrollment.academic_year}, ${enrollment.semester}`} />
      {!summary ? <p role="alert">Financial information is unavailable. Please refresh.</p> : <div className="space-y-4">
        <p className="font-semibold">{summary.payment_status}</p>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div><dt>Assessed</dt><dd>{money(summary.assessed_amount)}</dd></div>
          <div><dt>Paid</dt><dd>{money(summary.paid_amount)}</dd></div>
          <div><dt>Outstanding balance</dt><dd>{money(summary.balance_due)}</dd></div>
        </dl>
        {summary.fee_items?.length ? <ul>{summary.fee_items.map((fee, index) => <li key={`${fee.fee_code}:${index}`}>{fee.fee_name}: {money(fee.amount)}</li>)}</ul> : <p>No assessment recorded.</p>}
        <h2 className="font-semibold">Payments</h2>
        {summary.payment_receipts.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
          <thead><tr><th>Date</th><th>Reference</th><th>Amount</th></tr></thead>
          <tbody>{summary.payment_receipts.map((receipt) => <tr key={receipt.payment_id}>
            <td>{formatDate(receipt.paid_at)}</td><td>{receipt.reference ?? "Not recorded"}</td><td>{money(receipt.amount)}</td>
          </tr>)}</tbody>
        </table></div> : <p>No payments recorded.</p>}
      </div>}
    </Card>)}
  </div>;
}
