export const DEMO_RESET_CONFIRMATION = "RESET_PKM_DES_DEMO";

const ALLOWED_DEMO_ENVIRONMENTS = new Set(["local", "preview", "demo"]);

type Environment = Record<string, string | undefined>;

export type DemoResetAvailability = {
  enabled: boolean;
  reason: string;
  targetEnvironment: string | null;
  targetProjectRef: string | null;
};

function value(environment: Environment, key: string) {
  return String(environment[key] ?? "").trim();
}

function targetMatchesProject(environment: Environment) {
  const url = value(environment, "NEXT_PUBLIC_SUPABASE_URL");
  const projectRef = value(environment, "PKM_DEMO_PROJECT_REF").toLowerCase();

  if (!url || !projectRef) return false;

  try {
    const parsed = new URL(url);
    if (projectRef === "local") {
      return ["localhost", "127.0.0.1"].includes(parsed.hostname.toLowerCase()) && parsed.port === "54321";
    }

    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === `${projectRef}.supabase.co`;
  } catch {
    return false;
  }
}

export function getDemoResetAvailability(environment: Environment = process.env): DemoResetAvailability {
  const targetEnvironment = value(environment, "PKM_DEMO_ENVIRONMENT").toLowerCase() || null;
  const targetProjectRef = value(environment, "PKM_DEMO_PROJECT_REF").toLowerCase() || null;

  if (value(environment, "DEMO_RESET_ENABLED").toLowerCase() !== "true") {
    return {
      enabled: false,
      reason: "Demo reset controls are disabled for this deployment.",
      targetEnvironment,
      targetProjectRef
    };
  }

  if (!targetEnvironment || !ALLOWED_DEMO_ENVIRONMENTS.has(targetEnvironment)) {
    return {
      enabled: false,
      reason: "Demo reset controls require an explicitly labelled local, preview, or demo environment.",
      targetEnvironment,
      targetProjectRef
    };
  }

  if (value(environment, "PKM_ALLOW_DEMO_SEED").toLowerCase() !== "true") {
    return {
      enabled: false,
      reason: "Demo reset controls require the explicit demo-data opt-in.",
      targetEnvironment,
      targetProjectRef
    };
  }

  if (value(environment, "DEMO_RESET_CONFIRM") !== DEMO_RESET_CONFIRMATION) {
    return {
      enabled: false,
      reason: "Demo reset controls are not configured with the required server confirmation.",
      targetEnvironment,
      targetProjectRef
    };
  }

  if (!targetMatchesProject(environment)) {
    return {
      enabled: false,
      reason: "Demo reset controls are disabled because the configured database target is not an explicit demo target.",
      targetEnvironment,
      targetProjectRef
    };
  }

  return {
    enabled: true,
    reason: "This control is available only for the explicitly labelled demo database.",
    targetEnvironment,
    targetProjectRef
  };
}

export function isDemoResetConfirmation(valueToCheck: unknown) {
  return String(valueToCheck ?? "").trim() === DEMO_RESET_CONFIRMATION;
}
