"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Alert,
  Stack,
  IconButton,
  Paper,
  Chip,
} from "@mui/material";
import { Close, Cancel, Warning, Info } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { useCancelOrder } from "@/entities/order";

type UserRole = "seller" | "customer";

interface CancelOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  userRole: UserRole;
}

// Быстрые причины отмены для удобства
const quickReasons = {
  customer: [
    "Передумал покупать",
    "Нашёл дешевле",
    "Заказал по ошибке",
    "Слишком долгая обработка",
  ],
  seller: [
    "Товар закончился",
    "Ошибка в описании товара",
    "Невозможно выполнить доставку",
    "Подозрительный покупатель",
  ],
};

export const CancelOrderDialog = ({
  open,
  onClose,
  order,
  userRole,
}: CancelOrderDialogProps) => {
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");

  const cancelOrderMutation = useCancelOrder();

  const handleQuickReasonClick = (quickReason: string) => {
    setReason(quickReason);
  };

  const handleCancel = () => {
    cancelOrderMutation.mutate(
      {
        orderId: order.orderId,
        closureReason: reason.trim(),
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleClose = () => {
    setReason("");
    setComment("");
    onClose();
  };

  const canCancel = reason.trim().length >= 3 && !cancelOrderMutation.isPending;

  const roleLabels = {
    customer: "покупателя",
    seller: "продавца",
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <Cancel color="error" />
            <Typography variant="h6">Отмена заказа</Typography>
          </Stack>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Информация о заказе */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            Заказ #{order.orderId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {order.product.name}
          </Typography>
          <Typography variant="body2" fontWeight={500}>
            Сумма: {order.totalPrice} {order.product.currency}
          </Typography>
        </Paper>

        {/* Предупреждение */}
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            Вы собираетесь отменить заказ. Это действие необратимо. Вторая
            сторона будет уведомлена об отмене.
          </Typography>
        </Alert>

        {/* Быстрые причины */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Выберите причину или введите свою:
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {quickReasons[userRole].map((quickReason) => (
              <Chip
                key={quickReason}
                label={quickReason}
                onClick={() => handleQuickReasonClick(quickReason)}
                variant={reason === quickReason ? "filled" : "outlined"}
                color={reason === quickReason ? "primary" : "default"}
                size="small"
                sx={{ cursor: "pointer" }}
              />
            ))}
          </Stack>
        </Box>

        {/* Поле причины */}
        <TextField
          fullWidth
          label="Причина отмены"
          placeholder="Укажите причину отмены заказа..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{ mb: 2 }}
          required
          error={reason.length > 0 && reason.trim().length < 3}
          helperText={
            reason.length > 0 && reason.trim().length < 3
              ? "Минимум 3 символа"
              : "Обязательное поле"
          }
          disabled={cancelOrderMutation.isPending}
        />

        {/* Дополнительный комментарий */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Дополнительный комментарий (необязательно)"
          placeholder="Можете добавить пояснения..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
          disabled={cancelOrderMutation.isPending}
        />

        {/* Информационное сообщение */}
        <Alert severity="info" icon={<Info />}>
          <Typography variant="body2">
            После отмены заказ перейдёт в статус «Отклонён». Информация об
            отмене будет сохранена в истории заказа.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={cancelOrderMutation.isPending}>
          Назад
        </Button>
        <Button
          onClick={handleCancel}
          variant="contained"
          color="error"
          disabled={!canCancel}
          startIcon={cancelOrderMutation.isPending ? null : <Cancel />}
        >
          {cancelOrderMutation.isPending ? "Отмена..." : "Отменить заказ"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelOrderDialog;
