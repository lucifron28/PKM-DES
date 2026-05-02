import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default function CorPlaceholderPage() {
  return (
    <Card>
      <CardHeader title="Printable Registration Form" description="COR download placeholder" />
      <EmptyState
        title="Official COR / registration form template is needed."
        description="PDF generation is intentionally left as a placeholder until the official registration template is supplied."
      />
    </Card>
  );
}
