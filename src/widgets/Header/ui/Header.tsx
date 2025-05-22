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
import Logo from "@/shared/assets/images/logo.svg";
import headerBg from "@/shared/assets/images/header-bg.png";

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
            <Stack direction="row" alignItems="center" justifyContent="end">
              {/* <Link href="/" aria-label="Home">
                <Typography
                  component="h1"
                  variant="h6"
                  fontWeight={900}
                  textTransform="uppercase"
                  color={"secondary.contrastText"}
                >
                  3DM
                </Typography>
              </Link> */}
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
