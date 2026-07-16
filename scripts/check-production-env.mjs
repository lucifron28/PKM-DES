import { formatDeploymentEnvironmentError, validateProductionEnvironment } from "./deployment/deployment-env-utils.mjs";

try {
  const { provider } = validateProductionEnvironment();
  console.log(`Production environment check passed for DATABASE_PROVIDER=${provider}.`);
} catch (error) {
  console.error(`Production environment check failed: ${formatDeploymentEnvironmentError(error)}`);
  process.exitCode = 1;
}
