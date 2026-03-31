"use client";

import type { ReactNode } from "react";
import { Box, Typography, alpha, useTheme } from "@mui/material";

interface ProfileFormSectionProps {
  icon: ReactNode;
  title: string;
}

export const ProfileFormSection = ({
  icon,
  title,
}: ProfileFormSectionProps) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        px: { xs: 1.25, sm: 1.5 },
        py: 1,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        gap: 1,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: "primary.main",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" fontWeight={700}>
        {title}
      </Typography>
    </Box>
  );
};
