import { ClipboardCheck, FileCheck2, LogIn, UserPlus } from "lucide-react";
import { PublicReveal } from "@/components/public/public-reveal";
import { PublicHeader } from "@/components/layout/public-header";
import { BrandMarks } from "@/components/layout/pkm-mark";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SITE_NAME } from "@/lib/constants/pkm";

const processSteps = [
  ["1", "Claim a recognized student account", UserPlus, "Verify your official student record with your active email and Student ID."],
  ["2", "Submit an enrollment request", ClipboardCheck, "The system shows the configured student load for review and certification."],
  ["3", "Track Registrar review", FileCheck2, "See the request result, remarks, and the draft registration form when available."]
] as const;

export default function HomePage() {
  return (
    <div className="public-canvas min-h-screen">
      <PublicHeader />
      <main id="main-content" className="overflow-x-hidden">
        <PublicReveal>
          <section className="public-hero-texture relative overflow-hidden text-white shadow-panel">
            <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-24">
              <div className="max-w-4xl">
                <div data-public-hero-item className="mb-7 flex items-center gap-3">
                  <BrandMarks />
                  <span className="text-sm font-bold tracking-wide text-secondary-100">{SITE_NAME}</span>
                </div>
                <h1 data-public-hero-item className="public-display max-w-4xl text-4xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">
                  Welcome to Pambayang Kolehiyo ng Mauban!
                </h1>
                <p data-public-hero-item className="mt-7 max-w-2xl text-base leading-8 text-primary-50 sm:text-lg">
                  A web-based platform for managing student enrollment efficiently, securely, and transparently.
                </p>
                <div data-public-hero-item className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href="/login" variant="secondary" className="w-full sm:w-auto">
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Login to Portal
                  </ButtonLink>
                  <ButtonLink href="/create-account" variant="outline" className="w-full border-white/40 bg-white text-primary-800 hover:border-white hover:bg-primary-50 sm:w-auto">
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Create Student Account
                  </ButtonLink>
                </div>
              </div>
              <aside data-public-hero-item className="flex items-end" aria-label="Account creation guidance">
                <div className="w-full border-l-4 border-secondary-600 bg-white p-6 text-slateui-text shadow-lift sm:p-7">
                  <p className="text-sm font-bold text-primary-800">Before you begin</p>
                  <div className="mt-4 space-y-3.5 text-sm leading-6 text-slateui-secondary">
                    <p>Account creation is intended for officially recognized PKM students, including incoming first-year students and transferees who have passed initial admission screening.</p>
                    <p className="font-bold text-slateui-text">Use the active email address recorded with the Registrar.</p>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
            <div className="grid gap-5 border-b border-slateui-border pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-bold text-primary-800">Enrollment process</p>
                <h2 className="public-display mt-2 text-3xl font-semibold leading-tight text-slateui-text sm:text-4xl">A clear route from record to review.</h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-slateui-muted">The MVP keeps the student and Registrar steps visible without replacing PKM&apos;s official review process.</p>
            </div>
            <div className="mt-6 grid grid-flow-dense gap-4 md:grid-cols-3">
              {processSteps.map(([number, title, Icon, description]) => (
                <Card data-public-process-item key={title} className="group flex min-h-56 flex-col justify-between border-t-4 border-t-primary-800 p-6 transition-all duration-200 hover:-translate-y-1 hover:border-primary-200 hover:border-t-secondary-600 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-100 text-sm font-black text-slateui-text ring-1 ring-secondary-300">{number}</span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-800 transition-transform duration-200 group-hover:scale-105">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-7">
                    <h3 className="text-base font-bold text-slateui-text">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slateui-muted">{description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </PublicReveal>
      </main>
    </div>
  );
}
