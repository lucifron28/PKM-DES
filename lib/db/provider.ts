type DatabaseProvider = "supabase" | "sqlite";

function isProductionLikeRuntime() {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function getDatabaseProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER ?? "supabase";

  if (provider === "sqlite") {
    return "sqlite";
  }

  if (provider === "supabase") {
    return "supabase";
  }

  throw new Error("Invalid DATABASE_PROVIDER. Use 'supabase' or 'sqlite'.");
}

export function assertDatabaseProviderIsDeployable() {
  if (isProductionLikeRuntime() && getDatabaseProvider() === "sqlite") {
    throw new Error("SQLite is for local development only. Use DATABASE_PROVIDER=supabase for production.");
  }
}
