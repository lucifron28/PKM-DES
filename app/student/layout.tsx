import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { studentNavigation } from "@/lib/constants/navigation";
import { requireRole } from "@/lib/auth/session";
export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("student");

  return (
    <AppShell
      portalLabel="Student Portal"
      subtitle="Digital Enrollment System"
      navigation={studentNavigation}
      userName={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Student User"}
      userRole="Student"
    >
      {children}
    </AppShell>
  );
}
