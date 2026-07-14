const requiredProductionVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ACCOUNT_CLAIM_SECRET"
];

function fail(message) {
  console.error(`Production environment check failed: ${message}`);
  process.exit(1);
}

const provider = process.env.DATABASE_PROVIDER || "supabase";
const isProductionLike = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

if (provider !== "supabase" && provider !== "sqlite") {
  fail("DATABASE_PROVIDER must be either 'supabase' or 'sqlite'.");
}

if (isProductionLike && provider === "sqlite") {
  fail("SQLite is local-development only. Set DATABASE_PROVIDER=supabase for production/Vercel.");
}

if (provider === "supabase") {
  const missing = requiredProductionVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    fail(`missing required Supabase environment variables: ${missing.join(", ")}.`);
  }

  if (process.env.ACCOUNT_CLAIM_SECRET.length < 32) {
    fail("ACCOUNT_CLAIM_SECRET must be at least 32 characters.");
  }

  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);

    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) {
      fail("NEXT_PUBLIC_SUPABASE_URL must be an https://*.supabase.co project URL.");
    }
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }
}

console.log(`Production environment check passed for DATABASE_PROVIDER=${provider}.`);
