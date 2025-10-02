import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Divider,
  Button,
  Alert,
} from "@mui/material";
import { formatPrice } from "@/shared/lib/format-price";

type CheckoutOrderSummaryProps = {
  subtotal: number;
  deliveryPrice: number;
  total: number;
  itemsCount: number;
  isSubmitting: boolean;
  onSubmit: () => void;
};

export const CheckoutOrderSummary: React.FC<CheckoutOrderSummaryProps> = ({
  subtotal,
  deliveryPrice,
  total,
  itemsCount,
  isSubmitting,
  onSubmit,
}) => (
  <Box sx={{ position: "sticky", top: 24 }}>
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Сводка заказа
        </Typography>

        <Stack spacing={2} sx={{ mb: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="text.secondary">
              Товары ({itemsCount})
            </Typography>
            <Typography>{formatPrice(subtotal)} ₽</Typography>
          </Box>

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography color="text.secondary">Доставка</Typography>
            <Typography>
              {deliveryPrice === 0
                ? "Бесплатно"
                : `${formatPrice(deliveryPrice)} ₽`}
            </Typography>
          </Box>

          <Divider />

          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Итого
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatPrice(total)} ₽
            </Typography>
          </Box>
        </Stack>

        {subtotal < 3000 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Добавьте товаров еще на {formatPrice(3000 - subtotal)} ₽ для
            бесплатной доставки
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={isSubmitting}
          onClick={onSubmit}
          sx={{
            py: 1.5,
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          {isSubmitting ? "Оформление..." : "Подтвердить заказ"}
        </Button>
      </CardContent>
    </Card>

    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          Информация о доставке
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Бесплатная доставка от 3000 ₽<br />
          • Доставка в течение 1-3 рабочих дней
          <br />• Возможность оплаты при получении
        </Typography>
      </CardContent>
    </Card>
  </Box>
);
