import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function GradesPage() {
  return (
    <Card>
      <CardHeader title="Grades" />
      <EmptyState title="No grades available at this time." />
    </Card>
  );
}
