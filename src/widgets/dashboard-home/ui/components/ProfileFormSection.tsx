"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

interface ProfileFormSectionProps {
  icon: ReactNode;
  title: string;
}

export const ProfileFormSection = ({
  icon,
  title,
}: ProfileFormSectionProps) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          color: "primary.main",
          "& svg": { fontSize: 21 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight={800}>
        {title}
      </Typography>
    </Stack>
  );
};
