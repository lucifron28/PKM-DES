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
    <div className="min-h-screen bg-slateui-background">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-lg bg-primary-800 px-6 py-10 text-white">
          <Badge tone="brand">{PKM_IDENTITY.tagline}</Badge>
          <h1 className="mt-5 text-4xl font-bold tracking-normal">{PKM_IDENTITY.name}</h1>
          <div className="mt-6 grid gap-3 text-primary-50 md:grid-cols-2">
            <p className="flex items-start gap-2">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-secondary-500" aria-hidden="true" />
              {PKM_IDENTITY.address}
            </p>
            <div className="flex items-start gap-2">
              <Mail className="mt-1 h-4 w-4 shrink-0 text-secondary-500" aria-hidden="true" />
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
            <Card>
              <CardHeader title="Vision" />
              <p className="text-sm leading-7 text-slateui-secondary">{PKM_VISION}</p>
            </Card>
            <Card>
              <CardHeader title="Contact Links" />
              <div className="grid gap-3 text-sm font-medium">
                <a className="flex items-center gap-2 text-primary-800 hover:underline" href={PKM_IDENTITY.website}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Official Website
                </a>
                <a className="flex items-center gap-2 text-primary-800 hover:underline" href={PKM_IDENTITY.social.facebook}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Facebook
                </a>
                <a className="flex items-center gap-2 text-primary-800 hover:underline" href={PKM_IDENTITY.social.instagram}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Instagram
                </a>
                <a className="flex items-center gap-2 text-primary-800 hover:underline" href={PKM_IDENTITY.social.x}>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  X
                </a>
              </div>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader title="Mission" />
              <ol className="space-y-3 text-sm leading-7 text-slateui-secondary">
                {PKM_MISSION.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-100 text-xs font-bold text-slateui-text">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </Card>
            <Card>
              <CardHeader title="Goals" />
              <ol className="space-y-3 text-sm leading-7 text-slateui-secondary">
                {PKM_GOALS.map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-800">
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
