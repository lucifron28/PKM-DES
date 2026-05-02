import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE_NAME } from "@/lib/constants/pkm";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description:
    "Web-based enrollment and student information system for Pambayang Kolehiyo ng Mauban."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slateui-background text-slateui-text antialiased">{children}</body>
    </html>
  );
}
