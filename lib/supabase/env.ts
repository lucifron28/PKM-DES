import { assertDatabaseProviderIsDeployable } from "@/lib/db/provider";

export function getSupabaseBrowserEnv() {
  assertDatabaseProviderIsDeployable();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return { url, anonKey };
}

export function getSupabaseServiceEnv() {
  const { url } = getSupabaseBrowserEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Supabase service role key is not configured.");
  }

  return { url, serviceRoleKey };
}
