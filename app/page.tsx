import { ClipboardCheck, FileCheck2, LogIn, UserPlus } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { BrandMarks } from "@/components/layout/pkm-mark";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants/pkm";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main id="main-content">
        <section className="relative overflow-hidden bg-primary-800 text-white shadow-md">
          <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-secondary-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-24">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 backdrop-blur-xs">
                <BrandMarks />
                <span className="text-xs font-bold uppercase tracking-wider text-secondary-500">{SITE_NAME}</span>
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Welcome to Pambayang Kolehiyo ng Mauban!
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-primary-50 sm:text-lg">
                A web-based platform for managing student enrollment efficiently, securely, and transparently.
              </p>
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                <ButtonLink href="/login" variant="secondary" className="w-full sm:w-auto">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Login to Portal
                </ButtonLink>
                <ButtonLink
                  href="/create-account"
                  variant="outline"
                  className="w-full border-white/40 bg-white text-primary-800 hover:bg-primary-50 sm:w-auto"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create Student Account
                </ButtonLink>
              </div>
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-inner">
                <p className="text-xs font-bold uppercase tracking-widest text-secondary-500">
                  Digital Enrollment MVP Scope
                </p>
                <div className="mt-4 space-y-3.5 text-sm leading-6 text-primary-50">
                  <p>
                    Account creation is intended for officially recognized PKM students, including incoming
                    first-year students and transferees who have passed initial admission screening.
                  </p>
                  <p className="font-semibold text-white">Please use your active email address recorded with the Registrar.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-widest text-slateui-muted">Simple 3-Step Process</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slateui-text">How Enrollment Works</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["1", "Claim a recognized student account", UserPlus, "Verify your official student record with your active email."],
              ["2", "Submit Online Enrollment", ClipboardCheck, "Review program load and confirm your term submission."],
              ["3", "Track Registrar review result", FileCheck2, "View decision status, remarks, and draft COR print form."]
            ].map(([number, item, Icon, desc]) => (
              <Card key={item as string} className="group flex flex-col justify-between p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-100 text-sm font-black text-slateui-text ring-1 ring-secondary-300">
                    {number as string}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-800 transition-transform duration-200 group-hover:scale-110">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="mt-5">
                  <h3 className="text-base font-bold text-slateui-text">{item as string}</h3>
                  <p className="mt-2 text-xs leading-5 text-slateui-muted">{desc as string}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
