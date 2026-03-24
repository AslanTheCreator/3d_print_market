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
          isPreorder
            ? `linear-gradient(180deg, ${alpha(
                theme.palette.preorder.main,
                0.06,
              )} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`
            : theme.palette.background.paper,
        border: "1px solid",
        borderColor: isPreorder
          ? alpha("#000000", 0.08)
          : "divider",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
