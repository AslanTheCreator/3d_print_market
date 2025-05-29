import React from "react";
import { Box, Typography, Paper, useTheme, useMediaQuery } from "@mui/material";
import { formatPrice } from "@/shared/lib/formatPrice";

interface ProductPriceProps {
  price: number;
}

export const ProductPrice: React.FC<ProductPriceProps> = ({ price }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: "16px", sm: "20px", md: "24px" },
        p: {
          xs: "12px 20px",
          sm: "16px 24px",
          md: "20px 28px",
        },
        display: "flex",
        flexDirection: "column",
        width: { xs: "auto", md: "100%" },
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
      {/* Основная цена */}
      <Typography
        fontWeight={700}
        sx={{
          fontSize: {
            xs: "1.3125rem", // 21px
            sm: "1.5625rem", // 25px
            md: "1.875rem", // 30px
            lg: "2.125rem", // 34px
          },
          lineHeight: 1.1,
          color: "primary.main",
          mb: { md: 0.5 },
        }}
      >
        {formatPrice(price)} ₽
      </Typography>

      {/* Дополнительная информация для больших экранов */}
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

          {/* Информация о скидке (можно добавить логику) */}
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
};
