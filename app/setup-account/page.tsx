import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { Card, CardHeader } from "@/components/ui/card";
import { SetupAccountForm } from "./setup-account-form";

export const metadata: Metadata = {
  title: "Complete Account Setup"
};

export default function SetupAccountPage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        <Card>
          <CardHeader
            title="Complete Account Setup"
            description="Set your password to activate your official student account."
          />
          <SetupAccountForm />
        </Card>
      </main>
    </div>
  );
}
