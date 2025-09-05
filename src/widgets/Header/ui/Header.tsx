"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Box, Stack, Container, useMediaQuery, useTheme } from "@mui/material";
import { HeaderActions } from "./HeaderActions";
import { HeaderSearch } from "./HeaderSearch";
import Link from "next/link";
import throttle from "lodash.throttle";
import site from "@/shared/assets/logo/site.png";
import { HeaderLogo } from "./HeaderLogo";

export const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(
    throttle(() => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    }, 50),
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

  const headerHeight = "119px";

  // Адаптивные размеры логотипа site
  const getSiteLogoSize = () => {
    if (isMobile) return { width: 50, height: 50 };
    return { width: 116, height: 58 }; // Увеличили название сайта
  };

  const siteLogoSize = getSiteLogoSize();

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        width: "100%",
        top: isMobile ? (isVisible ? 0 : `-${headerHeight}`) : 0,
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
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
          sx={{
            minHeight: headerHeight,
          }}
        >
          {!isMobile ? (
            <>
              <HeaderLogo />
              <Stack
                direction="row"
                flex={1}
                spacing={2.5}
                mr={2.5}
                marginLeft={1.5}
              >
                <HeaderSearch />
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
                  <Link href="/" aria-label="Home">
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Image
                        src={site}
                        alt="Site Logo"
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
                <HeaderSearch isMobile />
              </Stack>
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
};
