"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Stack, Box, Typography } from "@mui/material";
import { HeaderCategoryButton } from "./HeaderCategoryButton";
import Logo from "@/shared/assets/logo/logo.svg";
import LogoDesktop from "@/shared/assets/logo/logo-desktop.png";
import { LOGO_SIZES } from "../model/constants";

interface HeaderLogoProps {
  isMobile: boolean;
}

export const HeaderLogo: React.FC<HeaderLogoProps> = ({ isMobile }) => {
  const logoSize = isMobile ? LOGO_SIZES.mobile : LOGO_SIZES.desktop;

  if (!isMobile) {
    return (
      <Stack
        direction="row"
        alignItems="center"
        sx={{ position: "relative", minWidth: 60 }}
        gap={1.5}
      >
        <Link
          href="/"
          aria-label="Figurzilla"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          <Stack direction="row" alignItems="center" gap={1}>
            <Image
              src={LogoDesktop}
              alt="Logo"
              width={logoSize.width}
              height={logoSize.height}
              priority
              style={{ objectFit: "contain" }}
            />
            <Typography
              component="span"
              sx={{
                fontSize: { md: "1.45rem", lg: "1.75rem" },
                fontWeight: 900,
                letterSpacing: 0,
                lineHeight: 1,
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              <Box component="span" sx={{ color: "primary.main" }}>
                FIGUR
              </Box>
              <Box component="span" sx={{ color: "common.white" }}>
                ZILLA
              </Box>
            </Typography>
          </Stack>
        </Link>
        <HeaderCategoryButton isMobile={false} />
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
        <HeaderCategoryButton isMobile />
      </Box>
    </Stack>
  );
};
