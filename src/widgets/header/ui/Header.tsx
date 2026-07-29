"use client";

import React from "react";
import Link from "next/link";
import { Box, Container, useTheme } from "@mui/material";
import { useHideOnScroll } from "@/shared/hooks";
import { LAYOUT } from "@/shared/config";
import site from "@/shared/assets/logo/site.png";
import { HeaderActions } from "./HeaderActions";
import { HeaderLogo } from "./HeaderLogo";
import { SearchForm } from "./SearchForm";
import { SCROLL_THRESHOLD, THROTTLE_DELAY } from "../model/constants";

export const Header = () => {
  const theme = useTheme();
  const [isCompactBehaviorEnabled, setIsCompactBehaviorEnabled] =
    React.useState(false);
  const compactMediaQuery = theme.breakpoints
    .down("sm")
    .replace("@media ", "");

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(compactMediaQuery);
    const updateCompactBehavior = () => {
      setIsCompactBehaviorEnabled(mediaQueryList.matches);
    };

    updateCompactBehavior();
    mediaQueryList.addEventListener("change", updateCompactBehavior);

    return () => {
      mediaQueryList.removeEventListener("change", updateCompactBehavior);
    };
  }, [compactMediaQuery]);

  const isVisible = useHideOnScroll({
    enabled: isCompactBehaviorEnabled,
    scrollThreshold: SCROLL_THRESHOLD,
    throttleDelay: THROTTLE_DELAY,
  });

  return (
    <Box
      component="header"
      data-testid="site-header"
      data-hidden={isVisible ? undefined : "true"}
      sx={{
        position: "fixed",
        width: "100%",
        top: 0,
        transform: "translateY(0)",
        transition: theme.transitions.create(["transform"], {
          duration: theme.transitions.duration.standard,
          easing: theme.transitions.easing.easeInOut,
        }),
        backgroundColor: theme.palette.secondary.main,
        zIndex: theme.zIndex.appBar,
        boxShadow: theme.shadows[4],
        "&[data-hidden='true']": {
          transform: "translateY(-100%)",
          boxShadow: "none",
        },
        [theme.breakpoints.up("sm")]: {
          transform: "none",
          transition: "none",
          boxShadow: theme.shadows[4],
          "&[data-hidden='true']": {
            transform: "none",
            boxShadow: theme.shadows[4],
          },
        },
      }}
    >
      <Container>
        <Box
          sx={{
            minHeight: LAYOUT.HEADER_HEIGHT_PX,
            pt: 1.5,
            pb: 2,
            display: "grid",
            gridTemplateAreas: {
              xs: `
                "logo compactBrand actions"
                "logo search search"
              `,
              md: '"logo search actions"',
            },
            gridTemplateColumns: {
              xs: "60px minmax(0, 1fr) auto",
              md: "auto minmax(0, 1fr) auto",
            },
            gridTemplateRows: {
              xs: "50px 35px",
              md: "auto",
            },
            rowGap: { xs: 0.5, md: 0 },
            alignItems: "center",
          }}
        >
          <HeaderLogo />

          <Box
            component={Link}
            href="/"
            aria-label="Главная страница"
            sx={{
              gridArea: "compactBrand",
              display: { xs: "block", md: "none" },
              width: 50,
              height: 50,
              backgroundImage: `url("${site.src}")`,
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "contain",
            }}
          />

          <Box
            sx={{
              gridArea: "search",
              minWidth: 0,
              ml: { xs: 0, md: "12px" },
              mr: { xs: 0, md: "20px" },
            }}
          >
            <SearchForm />
          </Box>

          <Box
            sx={{
              gridArea: "actions",
              justifySelf: "end",
            }}
          >
            <HeaderActions />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
