import { redirect } from "next/navigation";
import { requireOfficialSignerRole } from "@/lib/auth/session";

export default async function HealthRecordsPage() {
  await requireOfficialSignerRole("NURSE");
  redirect("/admin/clearances/health");
}
