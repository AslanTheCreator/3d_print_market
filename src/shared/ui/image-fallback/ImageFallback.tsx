"use client";

import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import ImageNotSupportedOutlinedIcon from "@mui/icons-material/ImageNotSupportedOutlined";

interface ImageFallbackProps {
  label?: string;
  compact?: boolean;
  iconSize?: number;
  sx?: SxProps<Theme>;
}

export function ImageFallback({
  label = "Изображение недоступно",
  compact = false,
  iconSize,
  sx,
}: ImageFallbackProps) {
  const baseSx: SxProps<Theme> = {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: compact ? 0.5 : 1,
    p: compact ? 0.75 : 2,
    bgcolor: "grey.100",
    color: "text.secondary",
    textAlign: "center",
  };

  const resolvedSx = sx
    ? [baseSx, ...(Array.isArray(sx) ? sx : [sx])]
    : baseSx;

  return (
    <Box role="img" aria-label={label} sx={resolvedSx}>
      <ImageNotSupportedOutlinedIcon
        sx={{ fontSize: iconSize ?? (compact ? 22 : 36), color: "inherit" }}
      />
      {!compact && (
        <Typography
          variant="body2"
          color="inherit"
          sx={{ maxWidth: "100%", overflowWrap: "anywhere" }}
        >
          {label}
        </Typography>
      )}
    </Box>
  );
}
