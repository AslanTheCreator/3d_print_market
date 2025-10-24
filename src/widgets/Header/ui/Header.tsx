"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Box, Stack, Container, useMediaQuery, useTheme } from "@mui/material";
import { HeaderActions } from "./HeaderActions";
import { SearchForm } from "@/features/search";
import Link from "next/link";
import throttle from "lodash.throttle";
import site from "@/shared/assets/logo/site.png";
import { HeaderLogo } from "./HeaderLogo";

const HEADER_HEIGHT = "119px";
const SCROLL_THRESHOLD = 50;
const THROTTLE_DELAY = 50;

export const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(
    throttle(() => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > SCROLL_THRESHOLD) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    }, THROTTLE_DELAY),
    [lastScrollY]
  );

  useEffect(() => {
    if (!isMobile) {
      setIsVisible(true);
      return;
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      handleScroll.cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile, handleScroll]);

  const getSiteLogoSize = () => {
    if (isMobile) return { width: 50, height: 50 };
    return { width: 116, height: 58 };
  };

  const siteLogoSize = getSiteLogoSize();

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        width: "100%",
        top: isMobile ? (isVisible ? 0 : `-${HEADER_HEIGHT}`) : 0,
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
            minHeight: HEADER_HEIGHT,
          }}
        >
          {!isMobile ? (
            <>
              <HeaderLogo />
              <Stack direction="row" flex={1} spacing={2.5} mr={2.5} ml={1.5}>
                <SearchForm />
              </Stack>
              <HeaderActions />
            </>
          ) : (
            <>
              <HeaderLogo />
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
                  <HeaderActions />
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
