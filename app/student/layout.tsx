import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StudentPortalProvider } from "@/components/student/student-portal-provider";
import { studentNavigation } from "@/lib/constants/navigation";
import { getStudentForProfile, requireRole } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireRole("student");
  const student = await getStudentForProfile(profile.id);

  return (
    <AppShell
      portalLabel="Student Portal"
      subtitle="Digital Enrollment System"
      navigation={studentNavigation}
      userName={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Student User"}
      userRole="Student"
    >
      <StudentPortalProvider value={{ profile, student }}>{children}</StudentPortalProvider>
    </AppShell>
  );
}
