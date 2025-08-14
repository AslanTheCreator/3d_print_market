import {
  alpha,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { formatPrice } from "@/shared/lib";

interface CartSummaryProps {
  itemsCount: number;
  total: number;
  onCheckout: () => void;
}

export const CartSummary = ({
  itemsCount,
  total,
  onCheckout,
}: CartSummaryProps) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h6" fontWeight={600}>
          Итого
        </Typography>

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body1" fontWeight={500} color="text.secondary">
            Товаров: {itemsCount}
          </Typography>
        </Stack>

        <Divider />

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="body1" fontWeight={600} color="text.primary">
            К оплате:
          </Typography>

          <Typography variant="h5" fontWeight={700} color="primary.main">
            {formatPrice(total)} ₽
          </Typography>
        </Stack>

        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={onCheckout}
          sx={{
            py: { xs: 1.5, sm: 2 },
            fontSize: { xs: "1rem", sm: "1.125rem" },
            fontWeight: 600,
            textTransform: "none",
            mt: 2,
          }}
        >
          Оформить заказ
        </Button>
      </Stack>
    </Paper>
  );
};
