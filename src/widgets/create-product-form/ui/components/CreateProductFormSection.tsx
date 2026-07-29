"use client";

import type { ReactNode } from "react";
import {
  Box,
  Typography,
  alpha,
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
            fontSize: { xs: 18, sm: 20 },
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="subtitle1"
        fontWeight={600}
        sx={{
          fontSize: { xs: "0.875rem", sm: "1rem" },
          lineHeight: 1.3,
        }}
      >
        {title}
      </Typography>
    </Box>
  );
};
