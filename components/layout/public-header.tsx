import Link from "next/link";
import { publicNavigation, studentNavigation, adminNavigation } from "@/lib/constants/navigation";
import { SITE_NAME } from "@/lib/constants/pkm";
import { getCurrentProfile } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { BrandMarks } from "./pkm-mark";

export async function PublicHeader() {
  const { profile } = await getCurrentProfile();
  const dashboardHref =
    profile?.role === "admin" ? "/admin/dashboard" : profile?.role === "student" ? "/student/dashboard" : null;
  const nav = profile?.role === "admin" ? adminNavigation : studentNavigation;

  return (
    <header className="border-b border-slateui-border bg-white">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandMarks />
          <span className="max-w-[620px] text-sm font-bold leading-5 text-slateui-text sm:text-base">
            {SITE_NAME}
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2">
          {dashboardHref ? (
            <ButtonLink href={dashboardHref} variant="outline">
              {nav[0].label}
            </ButtonLink>
          ) : (
            publicNavigation.map((item) => (
              <ButtonLink key={item.href} href={item.href} variant={item.label === "Login" ? "primary" : "ghost"}>
                {item.label}
              </ButtonLink>
            ))
          )}
        </nav>
      </div>
    </header>
  );
}
