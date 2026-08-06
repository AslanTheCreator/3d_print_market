"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { Stack, Box, Typography } from "@mui/material";
import Logo from "@/shared/assets/logo/logo.svg";
import LogoDesktop from "@/shared/assets/logo/logo-desktop.png";
import { HeaderCategoryButton } from "./HeaderCategoryButton";
import { LOGO_SIZES } from "../model/constants";

export const HeaderLogo = () => {
  const { props: mobileLogoProps } = getImageProps({
    src: Logo,
    alt: "",
    width: LOGO_SIZES.mobile.width,
    height: LOGO_SIZES.mobile.height,
    priority: true,
    sizes: `${LOGO_SIZES.mobile.width}px`,
  });
  const { props: desktopLogoProps } = getImageProps({
    src: LogoDesktop,
    alt: "",
    width: LOGO_SIZES.desktop.width,
    height: LOGO_SIZES.desktop.height,
    priority: true,
    sizes: `${LOGO_SIZES.desktop.width}px`,
  });

  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={{ xs: 0, md: 1.5 }}
      sx={{
        gridArea: "logo",
        position: "relative",
        minWidth: 60,
        alignSelf: "stretch",
      }}
    >
      <Link
        href="/"
        aria-label="Figurzilla"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            component="picture"
            data-testid="header-brand"
            sx={{
              display: "flex",
              flexShrink: 0,
              "& img": {
                display: "block",
                width: {
                  xs: LOGO_SIZES.mobile.width,
                  md: LOGO_SIZES.desktop.width,
                },
                height: {
                  xs: LOGO_SIZES.mobile.height,
                  md: LOGO_SIZES.desktop.height,
                },
                objectFit: "contain",
              },
            }}
          >
            <source
              media="(max-width: 899.95px)"
              srcSet={mobileLogoProps.srcSet ?? mobileLogoProps.src}
              sizes={`${LOGO_SIZES.mobile.width}px`}
            />
            <source
              media="(min-width: 900px)"
              srcSet={desktopLogoProps.srcSet ?? desktopLogoProps.src}
              sizes={`${LOGO_SIZES.desktop.width}px`}
            />
            <Image
              src={LogoDesktop}
              alt=""
              aria-hidden
              width={LOGO_SIZES.desktop.width}
              height={LOGO_SIZES.desktop.height}
              sizes={`${LOGO_SIZES.desktop.width}px`}
              loading="eager"
              fetchPriority="high"
            />
          </Box>

          <Typography
            component="span"
            sx={{
              display: { xs: "none", md: "inline" },
              fontSize: { md: "1.45rem", lg: "1.75rem" },
              fontWeight: 800,
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

      <Box
        sx={{
          position: { xs: "absolute", md: "static" },
          bottom: { xs: -1.5, md: "auto" },
          left: { xs: 11.5, md: "auto" },
          display: "flex",
        }}
      >
        <HeaderCategoryButton />
      </Box>
    </Stack>
  );
};
