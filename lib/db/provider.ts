export type DatabaseProvider = "supabase" | "sqlite";

export function getDatabaseProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER ?? "supabase";

  if (provider === "sqlite") {
    return "sqlite";
  }

  return "supabase";
}

export function assertDatabaseProviderIsDeployable() {
  if (process.env.VERCEL && getDatabaseProvider() === "sqlite") {
    throw new Error("SQLite is for local development only. Use DATABASE_PROVIDER=supabase on Vercel.");
  }
}
