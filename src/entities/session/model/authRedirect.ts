const REDIRECT_BASE = "https://figurzilla.invalid";

export const getPostAuthRedirectPath = (value: string | null): string => {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";

  try {
    const decoded = decodeURIComponent(value);
    if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith("//")) return "/";

    const url = new URL(value, REDIRECT_BASE);
    const decodedUrl = new URL(decoded, REDIRECT_BASE);
    if (
      url.origin !== REDIRECT_BASE ||
      decodedUrl.origin !== REDIRECT_BASE ||
      url.pathname.startsWith("//") ||
      decodedUrl.pathname.startsWith("//") ||
      /^\/auth(?:\/|$)/i.test(decodedUrl.pathname)
    ) return "/";

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
};

export const getAuthSwitchPath = (
  authPath: "/auth/login" | "/auth/register",
  redirectPath: string,
): string => {
  const safePath = getPostAuthRedirectPath(redirectPath);
  return safePath === "/"
    ? authPath
    : `${authPath}?${new URLSearchParams({ redirect: safePath })}`;
};
