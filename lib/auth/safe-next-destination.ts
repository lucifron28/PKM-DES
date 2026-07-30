import type { UserRole } from "@/types/database";

export function getSafeNextDestination(
  nextPath: string | null | undefined,
  role: UserRole
): string {
  const fallback = role === "admin" ? "/admin/dashboard" : "/student/dashboard";
  if (!nextPath || typeof nextPath !== "string") {
    return fallback;
  }

  const trimmed = nextPath.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0") ||
    !trimmed.startsWith("/")
  ) {
    return fallback;
  }

  try {
    const dummyUrl = new URL(trimmed, "http://localhost");
    const safePath = dummyUrl.pathname;

    const allowedPrefix = role === "admin" ? "/admin" : "/student";
    if (safePath === allowedPrefix || safePath.startsWith(`${allowedPrefix}/`)) {
      return safePath + dummyUrl.search;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
