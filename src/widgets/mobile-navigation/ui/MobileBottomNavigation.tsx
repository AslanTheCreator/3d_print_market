"use client";

import {
  Badge,
  Box,
  ButtonBase,
  Paper,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useCartChecks } from "@/entities/cart";
import { useFavoritesChecks } from "@/entities/favorite";
import { useAuth } from "@/entities/session";
import {
  isMobileNavigationItemActive,
  type MobileNavigationItem,
} from "../model/navigation";
import { MobileCategoriesDialog } from "./MobileCategoriesDialog";

const CATEGORIES_DIALOG_ID = "mobile-categories-dialog";

interface NavigationPresentation {
  label: string;
  icon: ReactNode;
  badge?: number;
}

const clampBadge = (value: number): number => Math.max(0, value);

export const MobileBottomNavigation = () => {
  const theme = useTheme();
  const pathname = usePathname();
  const { isAuthenticated, isInitialized } = useAuth();
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const categoriesTriggerRef = useRef<HTMLAnchorElement | null>(null);
  const wasCategoriesOpenRef = useRef(false);
  const canLoadPrivateBadges = isInitialized && isAuthenticated;
  const { getCartItemsCount } = useCartChecks(canLoadPrivateBadges);
  const { getFavoritesItemsCount } = useFavoritesChecks(canLoadPrivateBadges);

  const profileHref = isAuthenticated
    ? "/dashboard"
    : "/auth/login?redirect=%2Fdashboard";

  const items: MobileNavigationItem[] = [
    { kind: "link", id: "home", href: "/" },
    {
      kind: "categories",
      id: "categories",
      fallbackHref: "/catalog/search",
    },
    { kind: "link", id: "favorites", href: "/favorites" },
    { kind: "link", id: "cart", href: "/checkout" },
    { kind: "link", id: "profile", href: profileHref },
  ];

  const presentation: Record<MobileNavigationItem["id"], NavigationPresentation> = {
    home: { label: "Главная", icon: <HomeOutlinedIcon /> },
    categories: { label: "Категории", icon: <CategoryOutlinedIcon /> },
    favorites: {
      label: "Избранное",
      icon: <FavoriteBorderIcon />,
      badge: clampBadge(getFavoritesItemsCount),
    },
    cart: {
      label: "Корзина",
      icon: <ShoppingCartOutlinedIcon />,
      badge: clampBadge(getCartItemsCount),
    },
    profile: { label: "Профиль", icon: <PersonOutlineIcon /> },
  };

  useEffect(() => {
    if (wasCategoriesOpenRef.current && !isCategoriesOpen) {
      window.requestAnimationFrame(() => categoriesTriggerRef.current?.focus());
    }
    wasCategoriesOpenRef.current = isCategoriesOpen;
  }, [isCategoriesOpen]);

  const handleCategoriesClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey;

    if (isModifiedClick) return;

    event.preventDefault();
    setIsCategoriesOpen(true);
  };

  return (
    <>
      <Paper
        component="nav"
        aria-label="Основная навигация"
        square
        elevation={8}
        sx={{
          display: { xs: "grid", md: "none" },
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme.zIndex.appBar,
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          minHeight: "calc(64px + env(safe-area-inset-bottom))",
          pb: "env(safe-area-inset-bottom)",
          bgcolor: (currentTheme) =>
            alpha(currentTheme.palette.background.paper, 0.97),
          backdropFilter: "blur(14px)",
          "&::before": {
            content: '\"\"',
            position: "absolute",
            inset: "0 0 auto",
            height: "1px",
            bgcolor: "divider",
          },
        }}
      >
        {items.map((item) => {
          const itemPresentation = presentation[item.id];
          const isActive = isMobileNavigationItemActive(item.id, pathname);
          const href = item.kind === "link" ? item.href : item.fallbackHref;

          return (
            <ButtonBase
              key={item.id}
              ref={
                item.kind === "categories" ? categoriesTriggerRef : undefined
              }
              component={Link}
              href={href}
              onClick={
                item.kind === "categories" ? handleCategoriesClick : undefined
              }
              aria-current={isActive ? "page" : undefined}
              aria-label={itemPresentation.label}
              aria-haspopup={item.kind === "categories" ? "dialog" : undefined}
              aria-expanded={
                item.kind === "categories" ? isCategoriesOpen : undefined
              }
              aria-controls={
                item.kind === "categories" ? CATEGORIES_DIALOG_ID : undefined
              }
              sx={{
                position: "relative",
                minWidth: 0,
                minHeight: 64,
                px: 0.25,
                py: 0.5,
                color: isActive ? "primary.main" : "text.secondary",
                "&::before": isActive
                  ? {
                      content: '""',
                      position: "absolute",
                      top: 3,
                      left: "25%",
                      right: "25%",
                      height: 3,
                      borderRadius: 999,
                      bgcolor: "primary.main",
                    }
                  : undefined,
                "&.Mui-focusVisible": {
                  bgcolor: (currentTheme) =>
                    alpha(currentTheme.palette.primary.main, 0.1),
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  minWidth: 0,
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0.25,
                }}
              >
                <Badge
                  color="error"
                  badgeContent={itemPresentation.badge}
                  max={99}
                  invisible={!itemPresentation.badge}
                  sx={{
                    "& .MuiBadge-badge": {
                      minWidth: 18,
                      height: 18,
                      px: 0.5,
                      fontSize: "0.625rem",
                    },
                  }}
                >
                  <Box sx={{ display: "flex", "& svg": { fontSize: 24 } }}>
                    {itemPresentation.icon}
                  </Box>
                </Badge>
                <Typography
                  component="span"
                  sx={{
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                    fontWeight: isActive ? 700 : 600,
                    lineHeight: 1.2,
                    textAlign: "center",
                  }}
                >
                  {itemPresentation.label}
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Paper>

      <MobileCategoriesDialog
        id={CATEGORIES_DIALOG_ID}
        open={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
      />
    </>
  );
};
