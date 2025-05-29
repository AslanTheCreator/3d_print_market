"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Box,
  Stack,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CategoryToggleButton } from "./CategoryToggleButton";
import { HeaderIconLinks } from "./HeaderIconLinks";
import Link from "next/link";
import throttle from "lodash.throttle";
import SearchString from "./SearchString";
import Logo from "@/shared/assets/logo/logo.svg";
import headerBg from "@/shared/assets/images/header-bg.png";
import site from "@/shared/assets/logo/site.png";

export const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));

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
    if (isMobile) return { width: 50, height: 24 };
    if (isTablet) return { width: 100, height: 30 };
    return { width: 120, height: 36 };
  };

  const siteLogoSize = getSiteLogoSize();

  return (
    <Box
      component="header"
      sx={{
        position: "fixed",
        width: "100%",
        top: isMobile ? (isVisible ? 0 : `-${headerHeight}`) : 0,
        transition: isMobile ? "top 0.5s ease" : "none",
        backgroundColor: "secondary.main",
        zIndex: theme.zIndex.appBar || 999,
        backgroundImage: `url(${headerBg.src})`,
        border: `2px solid ${theme.palette.secondary.main}`,
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.15)",
      }}
    >
      <Container>
        <Stack
          pb={2}
          pt={1.5}
          gap={1}
          direction={"row"}
          alignItems={"center"}
          justifyContent={"space-between"}
        >
          {/* Logo*/}

          <Stack
            direction="row"
            alignItems="center"
            sx={{ position: "relative", minWidth: 60 }}
          >
            <Image
              src={Logo}
              alt="Logo"
              width={60}
              height={90}
              priority
              style={{ objectFit: "contain" }}
            />

            <Box
              sx={{
                position: "absolute",
                bottom: 4,
                left: 17,
              }}
            >
              <CategoryToggleButton />
            </Box>
          </Stack>

          <Stack direction="column" flex={1} spacing={0.5}>
            {/* Заголовок и иконки */}
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
                    filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                    transition: theme.transitions.create("transform", {
                      duration: theme.transitions.duration.shorter,
                    }),
                    "&:hover": {
                      transform: "scale(1.02)",
                    },
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
              <HeaderIconLinks />
            </Stack>
            {/* Search row */}
            <SearchString />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
