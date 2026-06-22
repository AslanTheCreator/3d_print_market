"use client";

import React from "react";
import Image from "next/image";
import { Box, Stack, Container, useTheme } from "@mui/material";
import { HeaderActions } from "./HeaderActions";
import { SearchForm } from "./SearchForm";
import Link from "next/link";
import site from "@/shared/assets/logo/site.png";
import { HeaderLogo } from "./HeaderLogo";
import { useIsMobile, useHideOnScroll } from "@/shared/hooks";
import { LAYOUT } from "@/shared/config";
import {
  SITE_LOGO_SIZES,
  SCROLL_THRESHOLD,
  THROTTLE_DELAY,
} from "../model/constants";

export const Header = () => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const siteLogoSize = isMobile ? SITE_LOGO_SIZES.mobile : SITE_LOGO_SIZES.desktop;

  const isVisible = useHideOnScroll({
    enabled: isMobile,
    scrollThreshold: SCROLL_THRESHOLD,
    throttleDelay: THROTTLE_DELAY,
  });
  const headerTransform = isMobile
    ? isVisible
      ? "translateY(0)"
      : "translateY(-100%)"
    : "none";
  const headerTransition = isMobile
    ? theme.transitions.create(["transform"], {
        duration: theme.transitions.duration.standard,
        easing: theme.transitions.easing.easeInOut,
      })
    : "none";

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        width: "100%",
        top: 0,
        transform: headerTransform,
        transition: headerTransition,
        backgroundColor: theme.palette.secondary.main,
        zIndex: theme.zIndex.appBar,
        boxShadow: isMobile && !isVisible ? "none" : theme.shadows[4],
      }}
    >
      <Container>
        <Stack
          pb={2}
          pt={1.5}
          direction="row"
          alignItems="center"
          justifyContent={isMobile ? "space-between" : "flex-start"}
          sx={{
            minHeight: LAYOUT.HEADER_HEIGHT_PX,
          }}
        >
          {!isMobile ? (
            <>
              <HeaderLogo isMobile={false} />
              <Stack
                direction="row"
                flex={1}
                mr="20px"
                ml="12px"
                sx={{
                  minWidth: 0,
                }}
              >
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
