export const getSafeTelegramUrl = (value?: string | null) => {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" && ["t.me", "telegram.me"].includes(url.hostname) && !url.username && !url.password && !url.port && url.pathname.length > 1 ? url.href : null;
  } catch { return null; }
};
