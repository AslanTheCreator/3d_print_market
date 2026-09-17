import { expect, test } from "@playwright/test";
import {
  getMobileChromeConfig,
  type MobileChromeConfig,
} from "@/app/layouts/mobileChrome";

interface MobileChromeTestCase {
  name: string;
  pathname: string;
  expected: MobileChromeConfig;
}

const browseChrome: MobileChromeConfig = {
  mode: "browse",
  showBottomNavigation: true,
  showMobileFooter: true,
};

const cases: MobileChromeTestCase[] = [
  { name: "home", pathname: "/", expected: browseChrome },
  {
    name: "catalog search",
    pathname: "/catalog/search",
    expected: browseChrome,
  },
  {
    name: "nested category",
    pathname: "/catalog/category/figures/anime",
    expected: browseChrome,
  },
  {
    name: "category slug that resembles a product detail suffix",
    pathname: "/catalog/category/detail",
    expected: browseChrome,
  },
  { name: "favorites", pathname: "/favorites", expected: browseChrome },
  {
    name: "seller",
    pathname: "/sellers/42",
    expected: {
      mode: "context",
      parentLabel: "Категории",
      backFallback: "/catalog/search",
      showBottomNavigation: true,
      showMobileFooter: true,
    },
  },
  {
    name: "product detail",
    pathname: "/catalog/42/detail",
    expected: {
      mode: "context",
      parentLabel: "Категории",
      backFallback: "/catalog/search",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "dashboard root",
    pathname: "/dashboard",
    expected: {
      mode: "account",
      parentLabel: "Профиль",
      showBottomNavigation: true,
      showMobileFooter: false,
      showAccountMenu: false,
    },
  },
  {
    name: "dashboard subroute",
    pathname: "/dashboard/purchase",
    expected: {
      mode: "account",
      parentLabel: "Профиль",
      title: "Покупки",
      backFallback: "/dashboard",
      showBottomNavigation: true,
      showMobileFooter: false,
      showAccountMenu: true,
    },
  },
  {
    name: "new product before dashboard matcher",
    pathname: "/dashboard/products/new",
    expected: {
      mode: "focused",
      parentLabel: "Мои товары",
      title: "Создать товар",
      backFallback: "/dashboard/products",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "sales use their own title",
    pathname: "/dashboard/sales",
    expected: {
      mode: "account", parentLabel: "Профиль", title: "Продажи", backFallback: "/dashboard",
      showBottomNavigation: true, showMobileFooter: false, showAccountMenu: true,
    },
  },
  {
    name: "security uses its own title",
    pathname: "/dashboard/security",
    expected: { mode: "account", parentLabel: "Профиль", title: "Безопасность", backFallback: "/dashboard", showBottomNavigation: true, showMobileFooter: false, showAccountMenu: true },
  },
  {
    name: "my products keep their existing chrome",
    pathname: "/dashboard/products",
    expected: {
      mode: "account", parentLabel: "Профиль", backFallback: "/dashboard",
      showBottomNavigation: true, showMobileFooter: false, showAccountMenu: true,
    },
  },
  {
    name: "edit product before dashboard matcher",
    pathname: "/dashboard/products/42/edit",
    expected: {
      mode: "focused",
      parentLabel: "Мои товары",
      backFallback: "/dashboard/products",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "checkout",
    pathname: "/checkout",
    expected: {
      mode: "focused",
      parentLabel: "Корзина",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "login",
    pathname: "/auth/login",
    expected: {
      mode: "auth",
      parentLabel: "Figurzilla",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "register",
    pathname: "/auth/register",
    expected: {
      mode: "auth",
      parentLabel: "Figurzilla",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: false,
    },
  },
  {
    name: "information page",
    pathname: "/privacy",
    expected: {
      mode: "context",
      parentLabel: "Figurzilla",
      backFallback: "/",
      showBottomNavigation: false,
      showMobileFooter: true,
    },
  },
  {
    name: "unknown route",
    pathname: "/missing-page",
    expected: browseChrome,
  },
  {
    name: "trailing slash",
    pathname: "/dashboard/settings/",
    expected: {
      mode: "account",
      parentLabel: "Профиль",
      title: "Настройки",
      backFallback: "/dashboard",
      showBottomNavigation: true,
      showMobileFooter: false,
      showAccountMenu: true,
    },
  },
];

test.describe("mobile chrome route model", () => {
  for (const { name, pathname, expected } of cases) {
    test(name, () => {
      expect(getMobileChromeConfig(pathname)).toEqual(expected);
    });
  }
});
