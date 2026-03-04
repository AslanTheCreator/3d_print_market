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
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import { Close, CloudUpload, Payment, CheckCircle } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { useSellerAccounts } from "@/entities/accounts";
import { imageApi } from "@/shared/api";
import { UseMutationResult } from "@tanstack/react-query";
import { SellerPaymentDetails } from "./SellerPaymentDetails";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentType = "payment" | "prepayment";

interface PaymentMutationParams {
  orderId: number;
  imageId: number;
  comment?: string;
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  paymentType: PaymentType;
  paymentMutation: UseMutationResult<
    any,
    Error,
    PaymentMutationParams,
    unknown
  >;
}

// ─────────────────────────────────────────────────────────────────────────────
// Конфигурация
// ─────────────────────────────────────────────────────────────────────────────

const paymentConfig = {
  payment: {
    title: "Подтверждение оплаты",
    buttonText: "Подтвердить оплату",
    buttonLoadingText: "Подтверждение...",
    instruction:
      "Выберите способ оплаты, переведите указанную сумму по реквизитам и загрузите скриншот или фото чека.",
    warning:
      "Убедитесь, что сумма и реквизиты верны. После подтверждения оплаты изменить данные будет невозможно.",
    amountLabel: "К оплате:",
  },
  prepayment: {
    title: "Подтверждение предоплаты",
    buttonText: "Подтвердить предоплату",
    buttonLoadingText: "Подтверждение...",
    instruction:
      "Выберите способ оплаты, переведите указанную сумму предоплаты по реквизитам и загрузите скриншот или фото чека.",
    warning:
      "Убедитесь, что сумма и реквизиты верны. После подтверждения предоплаты изменить данные будет невозможно.",
    amountLabel: "К предоплате:",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────────────────────────────────────

const PaymentDialog = ({
  open,
  onClose,
  order,
  paymentType,
  paymentMutation,
}: PaymentDialogProps) => {
  const [comment, setComment] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageId, setImageId] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const config = paymentConfig[paymentType];

  // ──────────────────────────────────────────────────────────────────────────
  // Загрузка всех счетов продавца
  // participantId = order.userInfo.id (он же product.sellerId)
  // Запрос выполняется только когда диалог открыт
  // ──────────────────────────────────────────────────────────────────────────
  const {
    data: sellerAccounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
  } = useSellerAccounts(open ? order.userInfo.id : undefined);

  // ──────────────────────────────────────────────────────────────────────────
  // Обработчики изображения
  // ──────────────────────────────────────────────────────────────────────────

  const validateImage = (file: File): boolean => {
    if (file.size > 10 * 1024 * 1024) {
      setImageError("Размер файла не должен превышать 10 МБ");
      resetImageState();
      return false;
    }
    if (!file.type.startsWith("image/")) {
      setImageError("Пожалуйста, загрузите изображение");
      resetImageState();
      return false;
    }
    return true;
  };

  const resetImageState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageId(null);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) return;

    setImageError(null);
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));

    try {
      setIsUploadingImage(true);
      const response = await imageApi.saveImage(file, "ORDER");
      setImageId(response[0]);
    } catch (error) {
      console.error("Ошибка при загрузке изображения:", error);
      setImageError("Не удалось загрузить изображение на сервер");
      resetImageState();
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Подтверждение оплаты
  // ──────────────────────────────────────────────────────────────────────────

  const handleConfirmPayment = () => {
    if (!selectedAccountId) return;

    if (!imageId) {
      setImageError(
        `Пожалуйста, загрузите подтверждение ${
          paymentType === "payment" ? "оплаты" : "предоплаты"
        }`,
      );
      return;
    }

    paymentMutation.mutate(
      {
        orderId: order.orderId,
        imageId: imageId,
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
    setComment("");
    setSelectedImage(null);
    setImagePreview(null);
    setImageId(null);
    setImageError(null);
    setIsUploadingImage(false);
    setSelectedAccountId(null);
    onClose();
  };

  const canConfirmPayment =
    selectedAccountId &&
    imageId &&
    !paymentMutation.isPending &&
    !isUploadingImage;

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
            <Typography variant="h6">{config.title}</Typography>
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
            {config.amountLabel} {order.totalPrice} {order.product.currency}
          </Typography>
        </Paper>

        {/* Инструкция */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">{config.instruction}</Typography>
        </Alert>

        {/* ── Реквизиты продавца (список с выбором) ── */}
        <SellerPaymentDetails
          accounts={sellerAccounts}
          isLoading={isAccountsLoading}
          isError={isAccountsError}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
        />

        {/* Загрузка чека */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Подтверждение {paymentType === "payment" ? "оплаты" : "предоплаты"}{" "}
            *
          </Typography>

          <input
            accept="image/*"
            style={{ display: "none" }}
            id="payment-proof-upload"
            type="file"
            onChange={handleImageUpload}
            disabled={isUploadingImage}
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
              {isUploadingImage ? (
                <Stack alignItems="center" spacing={1}>
                  <CircularProgress size={48} />
                  <Typography variant="body2" color="text.secondary">
                    Загрузка изображения...
                  </Typography>
                </Stack>
              ) : imagePreview ? (
                <Box>
                  <img
                    src={imagePreview}
                    alt={`Подтверждение ${
                      paymentType === "payment" ? "оплаты" : "предоплаты"
                    }`}
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

          {imageError && (
            <FormHelperText error sx={{ mt: 1 }}>
              {imageError}
            </FormHelperText>
          )}
        </Box>

        {/* Комментарий */}
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Комментарий (необязательно)"
          placeholder={`Добавьте комментарий к ${
            paymentType === "payment" ? "оплате" : "предоплате"
          }...`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
          disabled={isUploadingImage}
        />

        {/* Предупреждение */}
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">{config.warning}</Typography>
        </Alert>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={paymentMutation.isPending || isUploadingImage}
        >
          Отмена
        </Button>
        <Button
          onClick={handleConfirmPayment}
          variant="contained"
          disabled={!canConfirmPayment}
          startIcon={paymentMutation.isPending ? null : <Payment />}
        >
          {paymentMutation.isPending
            ? config.buttonLoadingText
            : config.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentDialog;
