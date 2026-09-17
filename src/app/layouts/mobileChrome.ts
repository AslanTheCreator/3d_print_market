export type MobileChromeMode =
  | "browse"
  | "context"
  | "account"
  | "focused"
  | "auth";

export interface MobileChromeConfig {
  mode: MobileChromeMode;
  parentLabel?: string;
  title?: string;
  backFallback?: string;
  showBottomNavigation: boolean;
  showMobileFooter: boolean;
  showAccountMenu?: boolean;
}

const BROWSE_CHROME: MobileChromeConfig = {
  mode: "browse",
  showBottomNavigation: true,
  showMobileFooter: true,
};

const normalizePathname = (pathname: string) => {
  const path = pathname.split(/[?#]/, 1)[0] || "/";

  if (path === "/") {
    return path;
  }

  return path.replace(/\/+$/, "");
};

const isPathWithin = (pathname: string, basePath: string) =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

const isProductDetailPath = (pathname: string) =>
  /^\/catalog\/[^/]+\/detail$/.test(pathname);

const isProductEditorPath = (pathname: string) =>
  pathname === "/dashboard/products/new" ||
  /^\/dashboard\/products\/[^/]+\/edit$/.test(pathname);

export const getMobileChromeConfig = (
  pathname: string,
): MobileChromeConfig => {
  const normalizedPathname = normalizePathname(pathname);

  if (isProductEditorPath(normalizedPathname)) {
    return {
      mode: "focused",
      parentLabel: "Мои товары",
      ...(normalizedPathname === "/dashboard/products/new" ? { title: "Создать товар" } : {}),
      backFallback: "/dashboard/products",
      showBottomNavigation: false,
      showMobileFooter: false,
    };
  }

  if (normalizedPathname === "/checkout") {
    return {
      mode: "focused",
      parentLabel: "Корзина",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: false,
    };
  }

  if (
    normalizedPathname === "/auth/login" ||
    normalizedPathname === "/auth/register"
  ) {
    return {
      mode: "auth",
      parentLabel: "Figurzilla",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: false,
    };
  }

  if (isPathWithin(normalizedPathname, "/catalog/category")) {
    return BROWSE_CHROME;
  }

  if (isProductDetailPath(normalizedPathname)) {
    return {
      mode: "context",
      parentLabel: "Категории",
      backFallback: "/catalog/search",
      showBottomNavigation: false,
      showMobileFooter: false,
    };
  }

  if (isPathWithin(normalizedPathname, "/sellers")) {
    return {
      mode: "context",
      parentLabel: "Категории",
      backFallback: "/catalog/search",
      showBottomNavigation: true,
      showMobileFooter: true,
    };
  }

  if (normalizedPathname === "/dashboard") {
    return {
      mode: "account",
      parentLabel: "Профиль",
      showBottomNavigation: true,
      showMobileFooter: false,
      showAccountMenu: false,
    };
  }

  if (isPathWithin(normalizedPathname, "/dashboard")) {
    return {
      mode: "account",
      parentLabel: "Профиль",
      ...(normalizedPathname === "/dashboard/purchase"
        ? { title: "Покупки" }
        : normalizedPathname === "/dashboard/sales"
          ? { title: "Продажи" }
          : normalizedPathname === "/dashboard/settings"
            ? { title: "Настройки" }
            : normalizedPathname === "/dashboard/security"
              ? { title: "Безопасность" }
              : {}),
      backFallback: "/dashboard",
      showBottomNavigation: true,
      showMobileFooter: false,
      showAccountMenu: true,
    };
  }

  if (
    normalizedPathname === "/about" ||
    normalizedPathname === "/contacts" ||
    normalizedPathname === "/privacy" ||
    normalizedPathname === "/user-agreement"
  ) {
    return {
      mode: "context",
      parentLabel: "Figurzilla",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: true,
    };
  }

  if (
    normalizedPathname === "/" ||
    normalizedPathname === "/catalog/search" ||
    normalizedPathname === "/favorites"
  ) {
    return BROWSE_CHROME;
  }

  return BROWSE_CHROME;
};
