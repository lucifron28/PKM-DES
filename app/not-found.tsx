import type { Metadata } from "next";
import { FileQuestion, Home } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found"
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content" className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6 lg:py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-800">
          <FileQuestion className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slateui-text sm:text-4xl">Page Not Found</h1>
        <p className="mt-3 text-base text-slateui-muted">
          The page or resource you are looking for could not be found or may have been moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/" variant="primary">
            <Home className="h-4 w-4" aria-hidden="true" />
            Return Home
          </ButtonLink>
          <ButtonLink href="/login" variant="outline">
            Login Page
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
