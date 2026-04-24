const LOCAL_API_URL = "http://localhost:8081";

const isProduction = process.env.NODE_ENV === "production";

const getRequiredEnvValue = (
  primaryValue: string | undefined,
  secondaryValue: string | undefined,
  envName: string,
): string => {
  const value = primaryValue ?? secondaryValue;

  if (value) {
    return value;
  }

  if (!isProduction) {
    return LOCAL_API_URL;
  }

  throw new Error(`${envName} is required in production`);
};

export const getServerApiBaseUrl = (): string =>
  getRequiredEnvValue(
    process.env.API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    "API_BASE_URL or NEXT_PUBLIC_API_URL",
  );

export const getClientApiBaseUrl = (): string =>
  getRequiredEnvValue(
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_BASE_URL,
    "NEXT_PUBLIC_API_URL or API_BASE_URL",
  );
