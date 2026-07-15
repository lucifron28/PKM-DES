import type { ReactNode } from "react";
import type { NavigationItem } from "@/lib/constants/navigation";
import { PortalNavigation } from "./portal-navigation";
import { PortalSectionHeader } from "./portal-section-header";

export function AppShell({
  portalLabel,
  subtitle,
  navigation,
  userName,
  userRole,
  children
}: {
  portalLabel: string;
  subtitle: string;
  navigation: NavigationItem[];
  userName: string;
  userRole: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slateui-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <PortalNavigation navigation={navigation} portalLabel={portalLabel} userName={userName} userRole={userRole} />
      <div className="min-w-0">
        <PortalSectionHeader portalLabel={portalLabel} subtitle={subtitle} navigation={navigation} />
        <main id="main-content" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
