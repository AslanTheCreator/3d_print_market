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
        backgroundColor: "#54C5E5",
        borderBottom: 1,
        borderColor: "lightgray",
        zIndex: theme.zIndex.appBar || 999,
      }}
    >
      <Container>
        <Stack py={2} gap={0.5}>
          {/* Logo and icons row */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Link href="/" aria-label="Home">
              <Stack direction="row" alignItems="center" gap={1}>
                <Image src="/" alt="Logo" width={35} height={35} priority />
                <Typography
                  component="h1"
                  variant="h6"
                  fontWeight={900}
                  textTransform="uppercase"
                  color="white"
                >
                  3DM
                </Typography>
              </Stack>
            </Link>
            <HeaderIconLinks />
          </Stack>

          {/* Search row */}
          <Stack direction="row" alignItems="center" gap={1}>
            <CategoryToggleButton />
            <SearchString />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};
