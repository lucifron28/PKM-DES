import { formatDeploymentEnvironmentError, isVercelBuild, validateVercelRuntimeEnvironment } from "./deployment/deployment-env-utils.mjs";

if (!isVercelBuild()) {
  console.log("Vercel environment check skipped outside Vercel.");
} else {
  try {
    validateVercelRuntimeEnvironment();
    console.log("Vercel environment check passed.");
  } catch (error) {
    console.error(`Vercel environment check failed: ${formatDeploymentEnvironmentError(error)}`);
    process.exitCode = 1;
  }
}
