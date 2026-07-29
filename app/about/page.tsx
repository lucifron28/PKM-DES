import type { Metadata } from "next";
import { ExternalLink, Mail, MapPin } from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import {
  PKM_GOALS,
  PKM_IDENTITY,
  PKM_MISSION,
  PKM_VISION
} from "@/lib/constants/pkm";

export const metadata: Metadata = {
  title: "About Us"
};

export default function AboutPage() {
  return (
    <div className="public-canvas min-h-screen">
      <PublicHeader />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="public-hero-texture relative mb-10 overflow-hidden border-l-4 border-secondary-600 px-6 py-10 text-white shadow-panel sm:px-8 sm:py-12">
          <Badge tone="brand">{PKM_IDENTITY.tagline}</Badge>
          <h1 className="public-display mt-5 max-w-4xl text-4xl font-semibold leading-[0.98] sm:text-6xl">{PKM_IDENTITY.name}</h1>
          <div className="mt-8 grid gap-4 text-primary-50 md:grid-cols-2">
            <p className="flex items-start gap-2.5 text-sm leading-6">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary-500" aria-hidden="true" />
              {PKM_IDENTITY.address}
            </p>
            <div className="flex items-start gap-2.5 text-sm leading-6">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-secondary-500" aria-hidden="true" />
              <div>
                {PKM_IDENTITY.emails.map((email) => (
                  <p key={email}>{email}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary-800">
              <CardHeader title="Vision" />
              <p className="text-sm leading-7 text-slateui-secondary">{PKM_VISION}</p>
            </Card>

            <Card className="border-t-4 border-t-secondary-600">
              <CardHeader title="Contact Links" />
              <div className="grid gap-3 text-sm font-semibold">
                {[
                  ["Official Website", PKM_IDENTITY.website],
                  ["Facebook", PKM_IDENTITY.social.facebook],
                  ["Instagram", PKM_IDENTITY.social.instagram],
                  ["X", PKM_IDENTITY.social.x]
                ].map(([label, url]) => (
                  <a
                    key={label}
                    className="inline-flex items-center gap-2 text-primary-800 transition-colors hover:text-primary-900 hover:underline"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </a>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-t-4 border-t-primary-800">
              <CardHeader title="Mission" />
              <ol className="space-y-3.5 text-sm leading-7 text-slateui-secondary">
                {PKM_MISSION.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary-100 text-xs font-bold text-slateui-text ring-1 ring-secondary-300">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </Card>

            <Card className="border-t-4 border-t-secondary-600">
              <CardHeader title="Goals" />
              <ol className="space-y-3.5 text-sm leading-7 text-slateui-secondary">
                {PKM_GOALS.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-bold text-primary-800 ring-1 ring-primary-200">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
