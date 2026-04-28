"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Stack, Box } from "@mui/material";
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
