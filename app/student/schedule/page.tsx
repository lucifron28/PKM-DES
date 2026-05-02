import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function ClassSchedulePage() {
  return (
    <Card>
      <CardHeader title="Class Schedule" />
      <EmptyState
        title="No schedule available."
        description="Schedule assignment is a placeholder for this MVP until the official class schedule format is supplied."
      />
    </Card>
  );
}
