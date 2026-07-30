import Link from "next/link";
import { publicNavigation } from "@/lib/constants/navigation";
import { SITE_NAME } from "@/lib/constants/pkm";
import { getCurrentProfile } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { BrandMarks } from "./pkm-mark";

export async function PublicHeader() {
  const { profile } = await getCurrentProfile();
  const isActive = profile?.account_status === "ACTIVE";
  const dashboardHref = isActive
    ? profile?.role === "admin"
      ? "/admin/dashboard"
      : profile?.role === "student"
        ? "/student/dashboard"
        : null
    : null;
  const dashboardLabel = profile?.role === "admin" ? "Open Admin Portal" : "Open Student Portal";

  return (
    <header className="sticky top-0 z-40 border-b border-primary-100/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2">
          <BrandMarks />
          <span className="text-sm font-bold leading-5 text-slateui-text sm:hidden">PKM-DES</span><span className="hidden max-w-[620px] text-sm font-bold leading-5 text-slateui-text sm:inline sm:text-base">{SITE_NAME}</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          {dashboardHref ? (
            <ButtonLink href={dashboardHref} variant="outline" className="px-3 sm:px-4">
              {dashboardLabel}
            </ButtonLink>
          ) : (
            publicNavigation.map((item) => (
              <ButtonLink key={item.href} href={item.href} variant={item.label === "Login" ? "primary" : "ghost"} className="px-3 sm:px-4">
                {item.label}
              </ButtonLink>
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
