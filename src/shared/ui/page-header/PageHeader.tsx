"use client";

import Link from "next/link";
import { ArrowBackRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  onBack?: () => void;
  title: string;
}

export const PageHeader = ({
  actions,
  backHref,
  backLabel = "Назад",
  icon,
  meta,
  onBack,
  title,
}: PageHeaderProps) => {
  const theme = useTheme();
  const hasBack = Boolean(backHref || onBack);

  const backButton = (
    <Button
      component={backHref ? Link : "button"}
      href={backHref}
      onClick={onBack}
      startIcon={<ArrowBackRounded />}
      sx={{
        alignSelf: "flex-start",
        minWidth: "auto",
        px: 0,
        color: "text.secondary",
        fontWeight: 600,
        textTransform: "none",
        "&:hover": {
          bgcolor: "transparent",
          color: "primary.main",
        },
      }}
    >
      {backLabel}
    </Button>
  );

  return (
    <Stack spacing={1.25} sx={{ mb: { xs: 2, sm: 3 } }}>
      {hasBack && backButton}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
          {icon && (
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                "& .MuiSvgIcon-root": {
                  fontSize: 26,
                },
              }}
            >
              {icon}
            </Box>
          )}

          <Box minWidth={0}>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 700,
                lineHeight: 1.15,
                fontSize: { xs: "1.5rem", sm: "1.875rem" },
              }}
            >
              {title}
            </Typography>
          </Box>
        </Stack>

        {actions && <Box sx={{ width: { xs: "100%", sm: "auto" } }}>{actions}</Box>}
      </Stack>

      {meta}
    </Stack>
  );
};
