import type { Metadata } from "next";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { isEligibleStudentSetupProfile } from "@/lib/account-setup/rules";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AccountStatus, UserRole } from "@/types/database";
import { SetupAccountForm } from "./setup-account-form";

export const metadata: Metadata = {
  title: "Complete Account Setup"
};

export default async function SetupAccountPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  const { error: callbackError } = (await searchParams) ?? {};

  let user = null;
  let profile: { role: UserRole; account_status: AccountStatus; email: string } | null = null;

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, account_status, email")
        .eq("id", user.id)
        .maybeSingle();
      profile = profileData as { role: UserRole; account_status: AccountStatus; email: string } | null;
    }
  } catch {
    user = null;
    profile = null;
  }

  const isEligible = Boolean(!callbackError && user && isEligibleStudentSetupProfile(profile));
  const isAlreadyActive = Boolean(user && profile?.account_status === "ACTIVE");

  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        {isEligible ? (
          <Card className="border-t-4 border-t-primary-800 sm:p-7">
            <CardHeader
              title="Complete Account Setup"
              description={`Set your password to activate your official student account (${profile?.email}).`}
            />
            <SetupAccountForm />
          </Card>
        ) : isAlreadyActive ? (
          <Card className="border-t-4 border-t-green-600 sm:p-7">
            <div className="flex items-center gap-3 text-green-800">
              <CheckCircle2 className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slateui-text">Account Already Active</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slateui-secondary">
              Your official student account is already active and your password has been set. You can log in directly to access your student portal.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/student/dashboard" variant="primary" className="w-full sm:w-auto">
                Go to Student Portal
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" className="w-full sm:w-auto">
                Go to Login
              </ButtonLink>
            </div>
          </Card>
        ) : (
          <Card className="border-t-4 border-t-amber-600 sm:p-7">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slateui-text">Setup Link Expired or Invalid</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-slateui-secondary">
              Your account setup session is invalid or has expired. For your security, account setup links can only be used once and expire after a short period.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <ButtonLink href="/create-account" variant="primary" className="w-full">
                Request a New Setup Email
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" className="w-full">
                Back to Login
              </ButtonLink>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
