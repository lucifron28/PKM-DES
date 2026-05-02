import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PkmMark } from "@/components/layout/pkm-mark";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants/pkm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main>
        <section className="bg-primary-800 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center gap-3">
                <PkmMark />
                <span className="text-sm font-semibold text-secondary-100">{SITE_NAME}</span>
              </div>
              <h1 className="text-4xl font-bold tracking-normal sm:text-5xl">
                Welcome to Pambayang Kolehiyo ng Mauban!
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-primary-50">
                A web-based platform for managing student enrollment efficiently and securely.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/login" variant="secondary">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Login
                </ButtonLink>
                <ButtonLink href="/create-account" variant="outline" className="border-white/40 bg-white text-primary-800">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create Student Account
                </ButtonLink>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-lg border border-white/20 bg-white/10 p-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-secondary-100">
                  Enrollment MVP
                </p>
                <div className="mt-5 space-y-4 text-sm leading-6 text-primary-50">
                  <p>
                    Account creation is intended for officially recognized PKM students, including incoming
                    first-year students and transferees who have passed initial admission screening.
                  </p>
                  <p>Please use your active email address.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Create or access a student account",
              "Submit online enrollment for review",
              "Monitor enrollment status and student records"
            ].map((item) => (
              <Card key={item} className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-slateui-secondary">{item}</span>
                <ArrowRight className="h-4 w-4 text-primary-800" aria-hidden="true" />
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
