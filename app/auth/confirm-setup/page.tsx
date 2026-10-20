import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  SETUP_CLAIM_COOKIE_NAME,
  parseSetupClaim
} from "@/lib/auth/setup-token";
import { ConfirmSetupButton } from "./confirm-button";

export const metadata: Metadata = {
  title: "Confirm Account Setup"
};

export default async function ConfirmSetupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: queryError } = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SETUP_CLAIM_COOKIE_NAME)?.value;
  const claim = parseSetupClaim(rawCookie);

  const hasValidClaim = Boolean(claim && !queryError);

  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
        {hasValidClaim ? (
          <Card className="border-t-4 border-t-primary-800 sm:p-7">
            <div className="flex items-center gap-3 text-primary-800">
              <ShieldCheck className="h-7 w-7 shrink-0" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-bold text-slateui-text">Confirm Account Setup</h1>
                <p className="mt-1 text-sm text-slateui-muted">
                  Verify your email to continue setting up your student account.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-md border border-slateui-border bg-slateui-surface/60 p-4 text-sm leading-6 text-slateui-secondary">
              To protect your one-time link from automated email scanners and link previews, please click below to proceed with setting your password.
            </div>

            <form
              action="/auth/confirm-setup/verify"
              method="POST"
              className="mt-6 space-y-4"
            >
              <ConfirmSetupButton />
              <ButtonLink href="/login" variant="ghost" className="w-full text-center">
                Cancel
              </ButtonLink>
            </form>
          </Card>
        ) : (
          <Card className="border-t-4 border-t-amber-600 sm:p-7">
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle className="h-7 w-7 shrink-0" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-bold text-slateui-text">Setup Link Expired or Invalid</h1>
                <p className="mt-1 text-sm text-slateui-muted">
                  Your setup session could not be confirmed.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-slateui-secondary">
              The setup link is missing, invalid, or has already been used. Account setup links are one-time use and expire for your security.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <ButtonLink href="/create-account" variant="primary" className="w-full text-center">
                Request a New Setup Email
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" className="w-full text-center">
                Back to Login
              </ButtonLink>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
