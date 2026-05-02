import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/session";

export default async function StudentRecordsPlaceholderPage() {
  await requireRole("admin");

  return (
    <Card>
      <CardHeader title="Student Records" description="Placeholder page for the student records module." />
      <EmptyState
        title="Official student records structure needed."
        description="This page is reserved until the official student record fields and retention requirements are supplied."
      />
    </Card>
  );
}
