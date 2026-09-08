import Image from "next/image";
import Link from "next/link";
import { Stack, Box, Typography } from "@mui/material";
import LogoDesktop from "@/shared/assets/logo/logo-desktop.png";
import { HeaderCategoryButton } from "./HeaderCategoryButton";
import { LOGO_SIZES } from "../model/constants";

export const HeaderLogo = () => {
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
        display: { xs: "none", md: "flex" },
      }}
    >
      <Link
        href="/"
        aria-label="Figurzilla"
        style={{ color: "inherit", textDecoration: "none" }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          <Box
            data-testid="header-brand"
            sx={{
              display: "flex",
              flexShrink: 0,
              "& img": {
                display: "block",
                width: LOGO_SIZES.desktop.width,
                height: LOGO_SIZES.desktop.height,
                objectFit: "contain",
              },
            }}
          >
            <Image
              src={LogoDesktop}
              alt=""
              aria-hidden
              width={LOGO_SIZES.desktop.width}
              height={LOGO_SIZES.desktop.height}
              sizes={`${LOGO_SIZES.desktop.width}px`}
            />
          </Box>

          <Typography
            component="span"
            sx={{
              display: "inline",
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
          position: "static",
          display: "flex",
        }}
      >
        <HeaderCategoryButton />
      </Box>
    </Stack>
  );
};
