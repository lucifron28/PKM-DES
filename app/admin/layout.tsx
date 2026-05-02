import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { adminNavigation } from "@/lib/constants/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");

  return (
    <AppShell title="Admin Portal" subtitle="Registrar and enrollment staff workspace" navigation={adminNavigation}>
      {children}
    </AppShell>
  );
}
