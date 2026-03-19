"use client";

import { alpha, Paper, PaperProps } from "@mui/material";

interface ProductPriceCardContainerProps extends Omit<PaperProps, "children"> {
  isPreorder: boolean;
  children: React.ReactNode;
}

export function ProductPriceCardContainer({
  isPreorder,
  children,
  sx,
  ...paperProps
}: ProductPriceCardContainerProps) {
  return (
    <Paper
      {...paperProps}
      sx={{
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(
            theme.palette.primary.main,
            0.08,
          )} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
        border: "2px solid",
        borderColor: isPreorder ? "preorder.main" : "primary.main",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
