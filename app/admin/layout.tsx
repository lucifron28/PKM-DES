import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { adminNavigation } from "@/lib/constants/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("admin");

  return (
    <AppShell portalLabel="Admin Portal" subtitle="Registrar and enrollment staff workspace" navigation={adminNavigation} userName={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Admin User"} userRole="Registrar/Admin">
      {children}
    </AppShell>
  );
}
