"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  ButtonBase,
  CircularProgress,
  Container,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import site from "@/shared/assets/logo/site.png";
import { LAYOUT } from "@/shared/config";
import { HeaderActions } from "./HeaderActions";
import { HeaderLogo } from "./HeaderLogo";
import { MobileSearchDialog } from "./MobileSearchDialog";
import { SearchForm } from "./SearchForm";

export type MobileHeaderMode =
  | "browse"
  | "context"
  | "account"
  | "focused"
  | "auth";

export interface MobileHeaderConfig {
  mode: MobileHeaderMode;
  parentLabel?: string;
  backFallback?: string;
  showAccountMenu?: boolean;
}

export interface HeaderProps {
  mobileConfig?: MobileHeaderConfig;
  mobileAction?: React.ReactNode;
}

const DEFAULT_MOBILE_CONFIG: MobileHeaderConfig = {
  mode: "browse",
};

const SearchFallback = () => (
  <Box sx={{ minHeight: 58, display: "grid", placeItems: "center" }}>
    <CircularProgress size={22} color="primary" />
  </Box>
);

export const Header = ({
  mobileConfig = DEFAULT_MOBILE_CONFIG,
  mobileAction,
}: HeaderProps) => {
  const theme = useTheme();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const { mode, parentLabel } = mobileConfig;
  const backFallback = mobileConfig.backFallback ?? "/";

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backFallback);
  };

  const isBrowse = mode === "browse";
  const showBack =
    mode === "context" ||
    mode === "focused" ||
    mode === "auth" ||
    (mode === "account" && Boolean(mobileConfig.backFallback));
  const mobileLabel = parentLabel ?? (mode === "account" ? "Профиль" : "Figurzilla");

  return (
    <Box
      component="header"
      data-testid="site-header"
      sx={{
        position: "fixed",
        width: "100%",
        top: 0,
        backgroundColor: theme.palette.secondary.main,
        zIndex: theme.zIndex.appBar,
        boxShadow: theme.shadows[4],
      }}
    >
      <Box
        data-testid="mobile-site-header"
        sx={{
          display: { xs: "block", md: "none" },
          pt: "env(safe-area-inset-top, 0px)",
        }}
      >
        <Container
          sx={{
            height: { xs: 56, sm: 64 },
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {isBrowse ? (
            <>
              <ButtonBase
                component={Link}
                href="/"
                aria-label="Figurzilla — главная страница"
                sx={{
                  width: 44,
                  height: 44,
                  flex: "0 0 44px",
                  borderRadius: 1.5,
                }}
              >
                <Image
                  src={site}
                  alt=""
                  aria-hidden
                  width={44}
                  height={44}
                  sizes="44px"
                  style={{ width: 44, height: 44, objectFit: "contain" }}
                />
              </ButtonBase>

              <ButtonBase
                type="button"
                aria-label="Открыть поиск"
                aria-haspopup="dialog"
                aria-expanded={isSearchOpen}
                aria-controls="mobile-search-dialog"
                onClick={() => setIsSearchOpen(true)}
                sx={{
                  minWidth: 0,
                  flex: 1,
                  height: 48,
                  px: 1.5,
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: 1,
                  color: "text.secondary",
                  bgcolor: "common.white",
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  borderRadius: 1.5,
                  "&:focus-visible": {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <SearchIcon color="primary" />
                <Typography noWrap variant="body2" component="span">
                  Найти товар
                </Typography>
              </ButtonBase>
            </>
          ) : (
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "44px minmax(0, 1fr) 44px",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {showBack ? (
                <IconButton
                  onClick={handleBack}
                  aria-label={`Назад${mobileLabel ? `: ${mobileLabel}` : ""}`}
                  sx={{ color: "common.white" }}
                >
                  <ArrowBackIcon />
                </IconButton>
              ) : (
                <Box aria-hidden />
              )}

              {mode === "auth" ? (
                <ButtonBase
                  component={Link}
                  href="/"
                  aria-label="Figurzilla — главная страница"
                  sx={{ justifySelf: "start", width: 44, height: 44, borderRadius: 1.5 }}
                >
                  <Image
                    src={site}
                    alt=""
                    aria-hidden
                    width={44}
                    height={44}
                    sizes="44px"
                    style={{ width: 44, height: 44, objectFit: "contain" }}
                  />
                </ButtonBase>
              ) : (
                <Typography
                  component="span"
                  noWrap
                  sx={{
                    color: "common.white",
                    fontWeight: 700,
                    textAlign: showBack ? "left" : "center",
                  }}
                >
                  {mobileLabel}
                </Typography>
              )}

              <Box sx={{ display: "grid", placeItems: "center" }}>
                {mobileAction}
              </Box>
            </Box>
          )}
        </Container>
      </Box>

      <Container sx={{ display: { xs: "none", md: "block" } }}>
        <Box
          sx={{
            minHeight: LAYOUT.HEADER_HEIGHT_PX,
            pt: 1.5,
            pb: 2,
            display: "grid",
            gridTemplateAreas: '"logo search actions"',
            gridTemplateColumns: "auto minmax(0, 1fr) auto",
            alignItems: "center",
          }}
        >
          <HeaderLogo />

          <Box sx={{ gridArea: "search", minWidth: 0, ml: "12px", mr: "20px" }}>
            <Suspense fallback={<SearchFallback />}>
              <SearchForm />
            </Suspense>
          </Box>

          <Box sx={{ gridArea: "actions", justifySelf: "end" }}>
            <HeaderActions />
          </Box>
        </Box>
      </Container>

      <MobileSearchDialog
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </Box>
  );
};
