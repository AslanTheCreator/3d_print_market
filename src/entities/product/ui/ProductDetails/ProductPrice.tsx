"use client";

import { Box, Typography, Paper, useTheme, useMediaQuery } from "@mui/material";
import { formatPrice } from "@/shared/lib/formatPrice";
import { Availability } from "../../model/types";

interface ProductPriceProps {
  price: number;
  prepaymentAmount: number;
  availability: Availability;
}

export function ProductPrice({
  price,
  prepaymentAmount,
  availability = "PURCHASABLE",
}: ProductPriceProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const isPreorder = availability === "PREORDER";
  const displayPrice = isPreorder ? prepaymentAmount : price;

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: "170px", sm: "auto" },
        borderRadius: { xs: 2.5, md: 3 },
        p: { xs: "8px 12px", sm: "16px 24px", md: "20px 28px" },
        background: {
          sm: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`,
        },
        border: { xs: "none", sm: `1px solid ${theme.palette.divider}` },
        transition: { xs: "none", sm: "all 0.3s ease" },
        "&:hover": {
          transform: { md: "translateY(-2px)" },
          boxShadow: { md: theme.shadows[4] },
          borderColor: { md: theme.palette.primary.light },
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          mb: { xs: 0, md: 0.5 },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: {
              xs: "1rem",
              sm: "1.125rem",
              md: "1.875rem",
              lg: "2.125rem",
            },
            fontWeight: 700,
            lineHeight: 1.1,
            color: "primary.main",
          }}
        >
          {formatPrice(displayPrice)} ₽
        </Typography>
      </Box>

      {!isMobile && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { sm: "0.875rem", md: "1rem" },
              fontWeight: 500,
            }}
          >
            Полная цена
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
