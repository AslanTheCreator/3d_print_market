"use client";

import type { ReactNode } from "react";
import {
  Box,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";

interface CreateProductFormSectionProps {
  icon: ReactNode;
  title: string;
}

export const CreateProductFormSection = ({
  icon,
  title,
}: CreateProductFormSectionProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 2 },
        py: { xs: 1, sm: 1.25 },
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.875, sm: 1.25 },
      }}
    >
      <Box
        sx={{
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "& svg": {
            fontSize: isMobile ? 18 : 20,
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant={isMobile ? "body2" : "subtitle1"}
        fontWeight={700}
        sx={{ lineHeight: 1.3 }}
      >
        {title}
      </Typography>
    </Box>
  );
};
