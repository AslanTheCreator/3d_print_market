"use client";

import {
  Box,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  Chip,
  Stack,
} from "@mui/material";
import { memo } from "react";
import { formatPrice } from "@/shared/lib/formatPrice";

interface ProductPriceProps {
  price: number;
  preorderPrice?: number;
  isPreorder?: boolean;
  variant?: "default" | "compact" | "mobile";
}

export const ProductPrice = memo<ProductPriceProps>(
  ({ price, preorderPrice, isPreorder = false, variant = "default" }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    return (
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: 2, sm: 2.5, md: 3 },
          p: { xs: "8px 12px", sm: "16px 24px", md: "20px 28px" },
          background:
            theme.palette.mode === "light"
              ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[50]} 100%)`
              : theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 0.3s ease",
          "&:hover": {
            transform: { md: "translateY(-2px)" },
            boxShadow: { md: theme.shadows[4] },
            borderColor: { md: theme.palette.primary.light },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.5,
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
            {formatPrice(price)} ₽
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
              Цена за единицу
            </Typography>

            <Typography
              variant="caption"
              color="success.main"
              sx={{
                fontSize: { sm: "0.75rem", md: "0.875rem" },
                fontWeight: 600,
                display: "block",
                mt: 0.5,
              }}
            >
              ✓ Лучшая цена
            </Typography>
          </Box>
        )}
      </Paper>
    );
  }
);

ProductPrice.displayName = "ProductPrice";
