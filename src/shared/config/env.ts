const LOCAL_API_URL = "http://localhost:8081";

const isProduction = process.env.NODE_ENV === "production";
const allowLocalApiUrl = process.env.ALLOW_LOCAL_API_URL === "true";

const stripTrailingSlash = (value: string): string => {
  if (value === "/") {
    return value;
  }

  return value.replace(/\/+$/, "");
};

const isRootRelativeUrl = (value: string): boolean =>
  value.startsWith("/") && !value.startsWith("//");

const isLocalApiUrl = (value: string): boolean => {
  if (isRootRelativeUrl(value)) {
    return false;
  }

  const { hostname } = new URL(value);

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  );
};

const normalizeApiUrl = (
  value: string | undefined,
  envName: string,
): string | undefined => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const normalizedValue = stripTrailingSlash(trimmedValue);

  if (isRootRelativeUrl(normalizedValue)) {
    return normalizedValue;
  }

  try {
    const url = new URL(normalizedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return normalizedValue;
  } catch {
    throw new Error(
      `${envName} must be an absolute http(s) URL or a root-relative URL`,
    );
  }
};

const getConfiguredApiUrl = (
  value: string | undefined,
  envName: string,
): string | undefined => {
  const apiUrl = normalizeApiUrl(value, envName);

  if (apiUrl && isProduction && isLocalApiUrl(apiUrl) && !allowLocalApiUrl) {
    throw new Error(`${envName} must not point to localhost in production`);
  }

  return apiUrl;
};

const getLocalApiUrl = (): string => {
  if (!isProduction) {
    return LOCAL_API_URL;
  }

  throw new Error("API URL is required in production");
};

export const getServerApiBaseUrl = (): string =>
  getConfiguredApiUrl(process.env.API_BASE_URL, "API_BASE_URL") ??
  getConfiguredApiUrl(process.env.NEXT_PUBLIC_API_URL, "NEXT_PUBLIC_API_URL") ??
  getLocalApiUrl();

export const getClientApiBaseUrl = (): string =>
  getConfiguredApiUrl(process.env.NEXT_PUBLIC_API_URL, "NEXT_PUBLIC_API_URL") ??
  getLocalApiUrl();
