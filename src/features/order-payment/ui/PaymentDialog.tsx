"use client";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  Stack,
  IconButton,
  Paper,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import { Close, CloudUpload, Payment, CheckCircle } from "@mui/icons-material";
import {
  getOrderPaymentBreakdown,
  type ListOrdersModel,
} from "@/entities/order";
import { useSellerAccounts } from "@/entities/account";
import { imageApi } from "@/entities/image";
import {
  createImagePreview,
  formatPrice,
  revokeImagePreview,
  validateImage,
} from "@/shared/lib";
import { transformToApiError } from "@/shared/lib/errorHandler";
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
    number,
    unknown,
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
    amountLabel: "К оплате:",
  },
  prepayment: {
    title: "Подтверждение предоплаты",
    buttonText: "Подтвердить предоплату",
    buttonLoadingText: "Подтверждение...",
    amountLabel: "К предоплате:",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentDialog = ({
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
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [hasAmbiguousMutationAttempt, setHasAmbiguousMutationAttempt] =
    useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const config = paymentConfig[paymentType];
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const amountToPay =
    paymentType === "prepayment"
      ? paymentBreakdown.prepaymentTotal
      : paymentBreakdown.remainingTotal;
  const mutationApiError = paymentMutation.error
    ? transformToApiError(paymentMutation.error)
    : null;
  const hasAmbiguousMutationError =
    mutationApiError?.code === "NETWORK_ERROR" ||
    mutationApiError?.code === "TIMEOUT";
  const expectedOrderStatus =
    paymentType === "prepayment"
      ? "AWAITING_PREPAYMENT"
      : "AWAITING_PAYMENT";
  const isExpectedOrderStatus = order.actualStatus === expectedOrderStatus;
  const fileInputId = `payment-proof-upload-${paymentType}-${order.orderId}`;

  // ──────────────────────────────────────────────────────────────────────────
  // Загрузка всех счетов продавца
  // participantId = order.userInfo.id (он же product.sellerId)
  // Запрос выполняется только когда диалог открыт
  // ──────────────────────────────────────────────────────────────────────────
  const {
    data: sellerAccounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    isFetching: isAccountsFetching,
    refetch: refetchSellerAccounts,
  } = useSellerAccounts(open ? order.userInfo.id : undefined);

  useEffect(() => {
    if (!open || !sellerAccounts) return;

    setSelectedAccountId((currentAccountId) => {
      if (sellerAccounts.length === 1) {
        return sellerAccounts[0].id;
      }

      return sellerAccounts.some(
        (account) => account.id === currentAccountId,
      )
        ? currentAccountId
        : null;
    });
  }, [open, sellerAccounts]);

  useEffect(() => {
    if (hasAmbiguousMutationError) {
      setHasAmbiguousMutationAttempt(true);
    }
  }, [hasAmbiguousMutationError]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        revokeImagePreview(imagePreview);
      }
    };
  }, [imagePreview]);

  // ──────────────────────────────────────────────────────────────────────────
  // Обработчики изображения
  // ──────────────────────────────────────────────────────────────────────────

  const resetImageState = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageId(null);
  };

  const deleteUnlinkedImage = async (unlinkedImageId: number) => {
    try {
      setIsDeletingImage(true);
      await imageApi.deleteImages([unlinkedImageId], "ORDER");
      return true;
    } catch (error) {
      console.error("Ошибка при удалении неподтверждённого изображения:", error);
      setImageError(
        "Не удалось удалить предыдущий чек. Повторите попытку, чтобы не создавать лишние файлы.",
      );
      return false;
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateImage(file);

    if (!validation.isValid) {
      setImageError(validation.error ?? "Invalid image");
      event.target.value = "";
      return;
    }

    if (
      paymentMutation.isPending ||
      hasAmbiguousMutationError ||
      hasAmbiguousMutationAttempt
    ) {
      setImageError(
        "Статус платежа уточняется. Повторите подтверждение с тем же чеком.",
      );
      event.target.value = "";
      return;
    }

    if (imageId) {
      const wasDeleted = await deleteUnlinkedImage(imageId);
      if (!wasDeleted) {
        event.target.value = "";
        return;
      }

      paymentMutation.reset();
    }

    setImageError(null);
    resetImageState();
    setSelectedImage(file);
    setImagePreview(createImagePreview(file));

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
    if (!selectedAccountId || !isExpectedOrderStatus) {
      return;
    }

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
          void handleClose({ keepUploadedImage: true });
        },
      },
    );
  };

  const handleClose = async ({
    keepUploadedImage = false,
  }: {
    keepUploadedImage?: boolean;
  } = {}) => {
    if (
      (!keepUploadedImage && paymentMutation.isPending) ||
      isUploadingImage ||
      isDeletingImage
    ) {
      return;
    }

    if (
      imageId &&
      !keepUploadedImage &&
      !hasAmbiguousMutationError &&
      !hasAmbiguousMutationAttempt
    ) {
      const wasDeleted = await deleteUnlinkedImage(imageId);
      if (!wasDeleted) return;
    }

    setComment("");
    setSelectedImage(null);
    setImagePreview(null);
    setImageId(null);
    setImageError(null);
    setIsUploadingImage(false);
    setIsDeletingImage(false);
    setHasAmbiguousMutationAttempt(false);
    setSelectedAccountId(null);
    paymentMutation.reset();
    onClose();
  };

  const hasSelectedAccount =
    !!selectedAccountId &&
    !!sellerAccounts?.some((account) => account.id === selectedAccountId);
  const accountsArePending = isAccountsLoading || isAccountsFetching;
  const canConfirmPayment =
    !!imageId &&
    hasSelectedAccount &&
    !accountsArePending &&
    !isAccountsError &&
    isExpectedOrderStatus &&
    !paymentMutation.isPending &&
    !isUploadingImage &&
    !isDeletingImage;
  const mutationErrorMessage = mutationApiError?.message ?? null;

  return (
    <Dialog
      open={open}
      onClose={() => void handleClose()}
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
          <IconButton onClick={() => void handleClose()} size="small">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {/* Информация о заказе */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            Заказ #{order.orderId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {order.product.name}
          </Typography>
          <Typography variant="h6" color="text.primary" fontWeight={600}>
            {paymentBreakdown.isPreorder && paymentType === "payment"
              ? "Остаток к оплате:"
              : config.amountLabel}{" "}
            {formatPrice(amountToPay, order.product.currency)}
          </Typography>
          {paymentBreakdown.isPreorder && (
            <Stack spacing={0.25} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Предоплата:{" "}
                {formatPrice(
                  paymentBreakdown.prepaymentTotal,
                  order.product.currency,
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Остаток после предоплаты:{" "}
                {formatPrice(
                  paymentBreakdown.remainingTotal,
                  order.product.currency,
                )}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Стоимость товаров:{" "}
                {formatPrice(
                  paymentBreakdown.productTotal,
                  order.product.currency,
                )}
              </Typography>
            </Stack>
          )}
        </Paper>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2.5 }}
        >
          Выберите реквизиты продавца и загрузите чек или скриншот перевода.
        </Typography>

        {/* ── Реквизиты продавца (список с выбором) ── */}
        <SellerPaymentDetails
          accounts={sellerAccounts}
          isLoading={accountsArePending}
          isError={isAccountsError}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onRetry={() => {
            void refetchSellerAccounts();
          }}
        />

        {mutationErrorMessage && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {mutationErrorMessage}
          </Alert>
        )}

        {!isExpectedOrderStatus && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Статус заказа уже обновился. Закройте диалог и проверьте актуальный
            этап заказа.
          </Alert>
        )}

        {/* Загрузка чека */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Чек или скриншот *
          </Typography>

          <input
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: "none" }}
            id={fileInputId}
            type="file"
            onChange={handleImageUpload}
            disabled={
              isUploadingImage ||
              isDeletingImage ||
              paymentMutation.isPending ||
              hasAmbiguousMutationError ||
              hasAmbiguousMutationAttempt
            }
          />

          <label htmlFor={fileInputId}>
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
              {isUploadingImage || isDeletingImage ? (
                <Stack alignItems="center" spacing={1}>
                  <CircularProgress size={48} />
                  <Typography variant="body2" color="text.secondary">
                    {isDeletingImage
                      ? "Удаление предыдущего изображения..."
                      : "Загрузка изображения..."}
                  </Typography>
                </Stack>
              ) : imagePreview ? (
                <Box>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    Поддерживаются: JPG, PNG, WebP (до 5 МБ)
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
          rows={2}
          label="Комментарий (необязательно)"
          placeholder={`Добавьте комментарий к ${
            paymentType === "payment" ? "оплате" : "предоплате"
          }...`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 1 }}
          disabled={isUploadingImage || isDeletingImage}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => void handleClose()}
          disabled={
            paymentMutation.isPending ||
            isUploadingImage ||
            isDeletingImage
          }
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
