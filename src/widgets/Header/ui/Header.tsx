"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { Box, Stack, Container, useTheme } from "@mui/material";
import { HeaderActions } from "./HeaderActions";
import { SearchForm } from "@/features/search";
import Link from "next/link";
import site from "@/shared/assets/logo/site.png";
import { HeaderLogo } from "./HeaderLogo";
import { useIsMobile, useHideOnScroll } from "@/shared/hooks";
import { LAYOUT } from "@/shared/config/layout";
import {
  SITE_LOGO_SIZES,
  SCROLL_THRESHOLD,
  THROTTLE_DELAY,
} from "../model/constants";

export const Header = () => {
  const theme = useTheme();
  const isMobile = useIsMobile();

  const isVisible = useHideOnScroll({
    enabled: isMobile,
    scrollThreshold: SCROLL_THRESHOLD,
    throttleDelay: THROTTLE_DELAY,
  });

  const siteLogoSize = useMemo(
    () => (isMobile ? SITE_LOGO_SIZES.mobile : SITE_LOGO_SIZES.desktop),
    [isMobile],
  );

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        width: "100%",
        top: isMobile ? (isVisible ? 0 : `-${LAYOUT.HEADER_HEIGHT_PX}`) : 0,
        transition: isMobile
          ? theme.transitions.create(["top"], {
              duration: theme.transitions.duration.standard,
              easing: theme.transitions.easing.easeInOut,
            })
          : "none",
        backgroundColor: theme.palette.secondary.main,
        zIndex: theme.zIndex.appBar,
        border: `2px solid ${theme.palette.secondary.main}`,
        boxShadow: theme.shadows[4],
      }}
    >
      <Container>
        <Stack
          pb={2}
          pt={1.5}
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            minHeight: LAYOUT.HEADER_HEIGHT_PX,
          }}
        >
          {!isMobile ? (
            <>
              <HeaderLogo isMobile={false} />
              <Stack direction="row" flex={1} spacing={2.5} mr={2.5} ml={1.5}>
                <SearchForm />
              </Stack>
              <HeaderActions isMobile={false} />
            </>
          ) : (
            <>
              <HeaderLogo isMobile />
              <Stack direction="column" flex={1} spacing={0.5}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Link href="/" aria-label="Главная страница">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        src={site}
                        alt="Логотип сайта"
                        width={siteLogoSize.width}
                        height={siteLogoSize.height}
                        priority
                        style={{
                          objectFit: "contain",
                          maxWidth: "100%",
                          height: "auto",
                        }}
                      />
                    </Box>
                  </Link>
                  <HeaderActions isMobile />
                </Stack>
                <SearchForm isMobile />
              </Stack>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
};
