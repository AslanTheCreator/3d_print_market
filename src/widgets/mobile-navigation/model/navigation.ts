export type MobileNavigationItem =
  | {
      kind: "link";
      id: "home" | "favorites" | "cart" | "profile";
      href: string;
    }
  | {
      kind: "categories";
      id: "categories";
      fallbackHref: "/catalog/search";
    };

export const isMobileNavigationItemActive = (
  itemId: MobileNavigationItem["id"],
  pathname: string,
): boolean => {
  switch (itemId) {
    case "home":
      return pathname === "/";
    case "categories":
      return (
        pathname === "/catalog" ||
        pathname.startsWith("/catalog/") ||
        pathname === "/sellers" ||
        pathname.startsWith("/sellers/")
      );
    case "favorites":
      return pathname === "/favorites";
    case "cart":
      return pathname === "/checkout";
    case "profile":
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }
};
