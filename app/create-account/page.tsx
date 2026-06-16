import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { CreateAccountForm } from "@/components/forms/create-account-form";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create Student Account"
};

export default function CreateAccountPage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader
            title="Create Student Account"
            description="Incoming 1st Year Students and Transferees must match a Registrar official record. Old Students must provide their Student ID Number."
          />
          <CreateAccountForm />
        </Card>
      </main>
    </div>
  );
}
