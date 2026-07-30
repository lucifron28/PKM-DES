import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { LoginForm } from "@/components/forms/login-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const params = (await searchParams) ?? {};
  return (
    <div className="public-canvas min-h-screen">
      <PublicHeader />
      <main id="main-content" className="mx-auto grid min-h-[calc(100dvh-73px)] max-w-6xl items-center gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <section className="hidden border-l-4 border-secondary-600 pl-6 lg:block">
          <KeyRound className="h-7 w-7 text-primary-800" aria-hidden="true" />
          <h1 className="public-display mt-5 text-5xl font-semibold leading-none text-primary-900">Your PKM-DES account.</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-slateui-secondary">Use your active email address and password to open the student or Registrar portal assigned to your account.</p>
        </section>
        <Card className="w-full max-w-md justify-self-center border-t-4 border-t-primary-800 sm:p-7">
          <CardHeader title="Login" description="Access your PKM-DES account with your active email address and password." />
          <LoginForm next={params.next} />
          <div className="mt-4">
            <ButtonLink href="/" variant="outline" className="w-full">Back to Home</ButtonLink>
          </div>
        </Card>
      </main>
    </div>
  );
}
