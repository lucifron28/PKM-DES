import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { CreateAccountForm } from "@/components/forms/create-account-form";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create Student Account"
};

export default async function CreateAccountPage({
  searchParams
}: {
  searchParams: Promise<{ claim?: string }>;
}) {
  const { claim } = await searchParams;
  const claimExpired = claim === "expired";

  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Card>
          <CardHeader
            title="Create Student Account"
            description="Verify your Registrar-managed record using your email address and Student ID, then set your password."
          />
          <CreateAccountForm claimExpired={claimExpired} />
        </Card>
      </main>
    </div>
  );
}
