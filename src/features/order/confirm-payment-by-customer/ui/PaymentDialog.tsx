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
} from "@mui/material";
import { Close, CloudUpload, Payment, CheckCircle } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { useConfirmPaymentByCustomer } from "@/entities/order";

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
}

const PaymentDialog = ({ open, onClose, order }: PaymentDialogProps) => {
  const [comment, setComment] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageId, setImageId] = useState<number | null>(null);

  const confirmPaymentMutation = useConfirmPaymentByCustomer();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);

      // Создаем превью изображения
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Здесь должна быть логика загрузки файла на сервер
      // и получения imageId
      // Пока что устанавливаем заглушку
      setImageId(1);
    }
  };

  const handleConfirmPayment = () => {
    if (!imageId) {
      return;
    }

    confirmPaymentMutation.mutate(
      {
        orderId: order.orderId,
        imageId: imageId,
        comment: comment.trim(),
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setComment("");
    setSelectedImage(null);
    setImagePreview(null);
    setImageId(null);
    onClose();
  };

  const canConfirmPayment = imageId && !confirmPaymentMutation.isPending;

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
            <Payment color="primary" />
            <Typography variant="h6">Подтверждение оплаты</Typography>
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
          <Typography variant="h6" color="primary.main" fontWeight={600}>
            К оплате: {order.totalPrice} {order.product.currency}
          </Typography>
        </Paper>

        {/* Инструкция по оплате */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Переведите указанную сумму продавцу любым удобным способом и
            загрузите скриншот или фото чека как подтверждение оплаты.
          </Typography>
        </Alert>

        {/* Загрузка чека */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Подтверждение оплаты *
          </Typography>

          <input
            accept="image/*"
            style={{ display: "none" }}
            id="payment-proof-upload"
            type="file"
            onChange={handleImageUpload}
          />

          <label htmlFor="payment-proof-upload">
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                textAlign: "center",
                cursor: "pointer",
                border: "2px dashed",
                borderColor: selectedImage ? "success.main" : "grey.300",
                bgcolor: selectedImage ? "success.50" : "grey.50",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.50",
                },
              }}
            >
              {imagePreview ? (
                <Box>
                  <img
                    src={imagePreview}
                    alt="Подтверждение оплаты"
                    style={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  />
                  <Typography variant="body2" color="success.main">
                    <CheckCircle sx={{ fontSize: 16, mr: 0.5 }} />
                    Изображение загружено
                  </Typography>
                </Box>
              ) : (
                <Stack alignItems="center" spacing={1}>
                  <CloudUpload sx={{ fontSize: 48, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    Нажмите, чтобы загрузить чек или скриншот
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Поддерживаются: JPG, PNG, GIF (до 10MB)
                  </Typography>
                </Stack>
              )}
            </Paper>
          </label>
        </Box>

        {/* Комментарий */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Комментарий (необязательно)"
          placeholder="Добавьте комментарий к оплате..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Предупреждение */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Убедитесь, что сумма и реквизиты верны. После подтверждения оплаты
            изменить данные будет невозможно.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={confirmPaymentMutation.isPending}
        >
          Отмена
        </Button>
        <Button
          onClick={handleConfirmPayment}
          variant="contained"
          disabled={!canConfirmPayment}
          startIcon={confirmPaymentMutation.isPending ? null : <Payment />}
        >
          {confirmPaymentMutation.isPending
            ? "Подтверждение..."
            : "Подтвердить оплату"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
