import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { LoginForm } from "@/components/forms/login-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login"
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto flex max-w-7xl items-center justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader
            title="Login"
            description="Access your PKM-DES account using your active email address and password."
          />
          <LoginForm />
          <div className="mt-4">
            <ButtonLink href="/" variant="outline" className="w-full">
              Back to Home
            </ButtonLink>
          </div>
        </Card>
      </main>
    </div>
  );
}
