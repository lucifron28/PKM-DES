import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { CreateAccountForm } from "@/components/forms/create-account-form";
import { getEmailEnv } from "@/lib/email";
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
  const emailEnv = getEmailEnv();

  return (
    <div className="public-canvas min-h-screen">
      <PublicHeader />
      <main id="main-content" className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">
        <section className="border-l-4 border-secondary-600 pl-5 sm:pl-6">
          <ClipboardCheck className="h-7 w-7 text-primary-800" aria-hidden="true" />
          <h1 className="public-display mt-4 text-4xl font-semibold leading-none text-primary-900 sm:text-5xl">Claim your student account.</h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slateui-secondary">
            {emailEnv.enabled
              ? "First locate the official student record prepared by the Registrar. Then confirm it to request a setup link."
              : "First locate the official student record prepared by the Registrar. Then confirm it and set a password for your account."}
          </p>
          <ol className="mt-7 space-y-3 text-sm text-slateui-secondary">
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-secondary-100 font-bold text-slateui-text">1</span>Find your official record.</li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-50 font-bold text-primary-800">2</span>Review the matched details.</li>
            <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-50 font-bold text-primary-800">3</span>{emailEnv.enabled ? "Receive setup link." : "Set your password."}</li>
          </ol>
        </section>
        <Card className="border-t-4 border-t-primary-800 sm:p-7">
          <CardHeader
            title="Create Student Account"
            description={emailEnv.enabled ? "Verify your Registrar-managed record using your email address and Student ID, then request a setup link." : "Verify your Registrar-managed record using your email address and Student ID, then set your password."}
          />
          <CreateAccountForm claimExpired={claimExpired} emailEnabled={emailEnv.enabled} />
        </Card>
      </main>
    </div>
  );
}
