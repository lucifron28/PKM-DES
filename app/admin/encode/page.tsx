import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";

export default async function EncodePlaceholderPage() {
  await requireRole("admin");

  return (
    <Card>
      <CardHeader title="Encode Grades/Schedule" description="Placeholder for grade and schedule encoding." />
      <EmptyState
        title="Official grading and class schedule formats are needed."
        description="Encoding workflows are intentionally not implemented until the required institutional rules are supplied."
      />
    </Card>
  );
}
