"use client";

import { Typography, TypographyProps } from "@mui/material";

interface ProductTitleProps extends Omit<TypographyProps, "children"> {
  title: string;
}

export function ProductTitle({ title, sx, ...typographyProps }: ProductTitleProps) {
  return (
    <Typography
      {...typographyProps}
      sx={{
        background: (theme) =>
          `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        ...sx,
      }}
    >
      {title}
    </Typography>
  );
}
