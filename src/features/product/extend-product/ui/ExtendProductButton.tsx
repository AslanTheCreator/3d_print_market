"use client";

import React, { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  CircularProgress,
  Stack,
  Box,
  alpha,
  useTheme,
} from "@mui/material";
import { Update, CalendarMonth, CheckCircle } from "@mui/icons-material";
import { useExtendProductExpiration } from "@/entities/product";
import { formatExpirationDate } from "@/entities/product/lib/productExpirationUtils";

interface ExtendProductButtonProps {
  productId: number;
  productName: string;
  currentExpirationDate: string;
  variant?: "button" | "icon";
  size?: "small" | "medium" | "large";
}

export const ExtendProductButton: React.FC<ExtendProductButtonProps> = ({
  productId,
  productName,
  currentExpirationDate,
  variant = "button",
  size = "small",
}) => {
  const theme = useTheme();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate: extendExpiration, isPending } = useExtendProductExpiration();

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isPending) {
      setIsDialogOpen(false);
    }
  };

  const handleConfirm = () => {
    extendExpiration(productId, {
      onSuccess: () => {
        handleCloseDialog();
      },
    });
  };

  // Расчет новой даты (текущая + 30 дней)
  const getNewExpirationDate = () => {
    const currentDate = new Date(currentExpirationDate);
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 30);
    return formatExpirationDate(newDate.toISOString());
  };

  return (
    <>
      {variant === "button" ? (
        <Button
          variant="contained"
          size={size}
          startIcon={<Update />}
          onClick={handleOpenDialog}
          disabled={isPending}
          sx={{
            bgcolor: "warning.main",
            color: "white",
            fontWeight: 600,
            "&:hover": {
              bgcolor: "warning.dark",
            },
          }}
        >
          Продлить
        </Button>
      ) : (
        <Button
          variant="outlined"
          size={size}
          startIcon={<Update />}
          onClick={handleOpenDialog}
          disabled={isPending}
          color="warning"
          sx={{ fontWeight: 600 }}
        >
          Продлить
        </Button>
      )}

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.warning.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarMonth color="warning" />
            </Box>
            <Typography variant="h6" fontWeight={700}>
              Продление срока действия
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5}>
            {/* Информация о товаре */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                Товар
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {productName}
              </Typography>
            </Box>

            {/* Текущая дата истечения */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.error.main, 0.05),
                border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Текущий срок действия
              </Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {formatExpirationDate(currentExpirationDate)}
              </Typography>
            </Box>

            {/* Новая дата */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                gutterBottom
                display="block"
              >
                Новый срок действия (+30 дней)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {getNewExpirationDate()}
                </Typography>
                <CheckCircle color="success" sx={{ fontSize: 20 }} />
              </Stack>
            </Box>

            {/* Информация */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                После продления товар будет активен ещё 30 дней. Вы можете
                продлевать товар неограниченное количество раз.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={handleCloseDialog}
            disabled={isPending}
            variant="outlined"
            size="large"
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            variant="contained"
            color="warning"
            size="large"
            startIcon={isPending ? <CircularProgress size={20} /> : <Update />}
            sx={{ minWidth: 140 }}
          >
            {isPending ? "Продление..." : "Продлить"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
