import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Crimson_Pro } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants/pkm";

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-portal"
});

const crimsonPro = Crimson_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-display"
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description:
    "Web-based enrollment and student information system for Pambayang Kolehiyo ng Mauban.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${atkinsonHyperlegible.variable} ${crimsonPro.variable} bg-slateui-background text-slateui-text antialiased`}><a href="#main-content" className="skip-link">Skip to main content</a>{children}</body>
    </html>
  );
}
