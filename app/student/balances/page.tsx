import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function BalancesPage() {
  return (
    <Card>
      <CardHeader title="Balances" />
      <EmptyState title="No balance records found." />
    </Card>
  );
}
