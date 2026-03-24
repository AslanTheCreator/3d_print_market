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
        color: "text.primary",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        ...sx,
      }}
    >
      {title}
    </Typography>
  );
}
