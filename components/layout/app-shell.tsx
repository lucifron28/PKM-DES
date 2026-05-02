import type { ReactNode } from "react";
import type { NavigationItem } from "@/lib/constants/navigation";
import { PkmMark } from "./pkm-mark";
import { LogoutButton } from "./logout-button";
import { SideNav } from "./side-nav";

export function AppShell({
  title,
  subtitle,
  navigation,
  children
}: {
  title: string;
  subtitle: string;
  navigation: NavigationItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slateui-background">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slateui-border bg-white px-4 py-4 lg:border-b-0 lg:border-r lg:px-5">
          <div className="mb-6 flex items-center gap-3">
            <PkmMark />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slateui-text">PKM-DES</p>
              <p className="truncate text-xs text-slateui-muted">{subtitle}</p>
            </div>
          </div>
          <SideNav items={navigation} />
          <div className="mt-4 border-t border-slateui-border pt-3">
            <LogoutButton />
          </div>
        </aside>
        <main className="min-w-0">
          <header className="border-b border-slateui-border bg-white px-4 py-5 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-slateui-text">{title}</h1>
            <p className="mt-1 text-sm text-slateui-muted">{subtitle}</p>
          </header>
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
