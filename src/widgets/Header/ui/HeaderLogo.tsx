"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Stack, Box, useTheme, useMediaQuery } from "@mui/material";
import { HeaderCategoryButton } from "./HeaderCategoryButton";
import Logo from "@/shared/assets/logo/logo.svg";
import LogoDesktop from "@/shared/assets/logo/logo-desktop.png";
import site from "@/shared/assets/logo/site.png";

export const HeaderLogo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Адаптивные размеры логотипа динозаврика
  const getLogoSize = () => {
    if (isMobile) return { width: 60, height: 90 };
    return { width: 69, height: 85 };
  };

  // Адаптивные размеры логотипа site
  const getSiteLogoSize = () => {
    if (isMobile) return { width: 50, height: 50 };
    return { width: 116, height: 58 };
  };

  const logoSize = getLogoSize();
  const siteLogoSize = getSiteLogoSize();

  if (!isMobile) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        sx={{ position: "relative", minWidth: 60 }}
        gap={2}
      >
        <Link href="/" aria-label="Home">
          <Image
            src={LogoDesktop}
            alt="Logo"
            width={logoSize.width}
            height={logoSize.height}
            priority
            style={{ objectFit: "contain" }}
          />
        </Link>
        <HeaderCategoryButton />
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ position: "relative", minWidth: 60 }}
    >
      <Image
        src={Logo}
        alt="Logo"
        width={logoSize.width}
        height={logoSize.height}
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
        <HeaderCategoryButton />
      </Box>
    </Stack>
  );
};
