"use client";
import React, { useEffect, useRef, useState } from "react";
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
  OrderCalculationSummary,
  getOrderPaymentBreakdown,
  usePaymentTermsCheck,
  type ListOrdersModel,
} from "@/entities/order";
import { useSellerAccounts } from "@/entities/account";
import { usePrivateScope } from "@/shared/lib/query";
import { imageApi } from "@/entities/image";
import {
  createImagePreview,
  revokeImagePreview,
  validateImage,
} from "@/shared/lib";
import { serializeApiError, transformToApiError } from "@/shared/lib/errorHandler";
import type { UseMutationResult } from "@tanstack/react-query";
import { SellerPaymentDetails } from "./SellerPaymentDetails";
import { useCustomerPaymentAttempt } from "../model/useCustomerPaymentAttempt";
import { DisputePaymentDialog, type DisputePaymentDialogProps } from "./DisputePaymentDialog";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentType = "payment" | "prepayment" | "dispute";

interface PaymentMutationParams {
  orderId: number;
  imageId: number;
  comment?: string;
}

interface PaymentDialogProps {
  open: boolean;
  actionsAvailable?: boolean;
  onRetry?: () => void;
  retryPending?: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  paymentType: Exclude<PaymentType, "dispute">;
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
  },
  prepayment: {
    title: "Подтверждение предоплаты",
    buttonText: "Подтвердить предоплату",
    buttonLoadingText: "Подтверждение...",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Компонент
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentDialog = (props: PaymentDialogProps | DisputePaymentDialogProps) =>
  props.paymentType === "dispute" ? <DisputePaymentDialog {...props} /> : <NormalPaymentDialog {...props} />;

const NormalPaymentDialog = ({
  open,
  actionsAvailable = true,
  onRetry,
  retryPending = false,
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
  const termsMatch = usePaymentTermsCheck("customer");
  const scope = usePrivateScope();
  const lock = useRef(false);
  const revision = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const latest = useRef({ order, open, actionsAvailable, selectedAccountId: null as number | null, accountsReady: false });
  const attempt = useCustomerPaymentAttempt(order, paymentType, actionsAvailable);
  const unresolved = attempt.phase === "unknown";
  const sharedPending = attempt.phase === "pending";
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const config = paymentConfig[paymentType];
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const paymentBlock = paymentType === "prepayment" ? paymentBreakdown.prepaymentBlock : paymentBreakdown.paymentBlock;
  const mutationApiError = paymentMutation.error
    ? transformToApiError(paymentMutation.error)
    : null;
  const expectedOrderStatus =
    paymentType === "prepayment"
      ? "AWAITING_PREPAYMENT"
      : "AWAITING_PAYMENT";
  const isExpectedOrderStatus = order.actualStatus === expectedOrderStatus;
  const showPaymentInstructions = actionsAvailable && isExpectedOrderStatus && !paymentBlock && !unresolved && !sharedPending;
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
  } = useSellerAccounts(open && showPaymentInstructions ? order.userInfo.id : undefined);

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || paymentBlock || lock.current || paymentMutation.isPending || imageId || !scope.isCurrent() || attempt.blocked()) return;
    const validation = validateImage(file);
    if (!validation.isValid) {
      setImageError(validation.error ?? "Invalid image");
      return;
    }
    setImageError(null);
    setSelectedImage(file);
    setImagePreview(createImagePreview(file));
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Подтверждение оплаты
  // ──────────────────────────────────────────────────────────────────────────

  const handleConfirmPayment = async () => {
    if (lock.current || !canConfirmPayment || attempt.blocked() || !scope.isCurrent() || !open) return;
    lock.current = true;
    const generation = revision.current;
    const orderId = order.orderId;
    const isCurrent = () => scope.isCurrent() && generation === revision.current && latest.current.open && latest.current.order.orderId === orderId;
    const submittedComment = comment.trim();
    let submittedProofId: number | null = null;
    try {
      if (!termsMatch(order)) {
        setImageError("Обновите заказ и проверьте расчёт.");
        return;
      }
      let proofId = imageId;
      if (!proofId && selectedImage) {
        const controller = new AbortController();
        uploadController.current = controller;
        setIsUploadingImage(true);
        setImageError(null);
        const [uploadedId] = await imageApi.saveOrderImage(selectedImage, orderId, controller.signal);
        if (!isCurrent()) return;
        proofId = uploadedId;
        setImageId(proofId);
        setIsUploadingImage(false);
      }
      if (!isCurrent() || !proofId) return;
      const current = latest.current;
      if (!current.actionsAvailable || current.order.actualStatus !== expectedOrderStatus || !current.accountsReady || !current.selectedAccountId) return;
      if (!termsMatch(order) || getOrderPaymentBreakdown(current.order).fingerprint !== paymentBreakdown.fingerprint) {
        setImageError("Условия заказа изменились. Проверьте новый расчёт и подтвердите действие ещё раз.");
        return;
      }
      if (!attempt.begin(proofId)) return;
      submittedProofId = proofId;
      const response = await paymentMutation.mutateAsync({ orderId, imageId: proofId, comment: submittedComment });
      const accepted = attempt.finish(proofId, { response });
      if (accepted && isCurrent()) handleClose({ keepUploadedImage: true });
    } catch (error) {
      if (submittedProofId !== null) attempt.finish(submittedProofId, { error });
      if (!isCurrent()) return;
      if (submittedProofId === null) {
        console.error("Ошибка при загрузке изображения:", serializeApiError(error));
        setImageError("Не удалось загрузить изображение на сервер");
      }
    } finally {
      if (generation === revision.current) {
        lock.current = false;
        uploadController.current = null;
        setIsUploadingImage(false);
      }
    }
  };

  const handleClose = ({ keepUploadedImage = false }: { keepUploadedImage?: boolean } = {}) => {
    if (!keepUploadedImage && (lock.current || paymentMutation.isPending || isUploadingImage)) return;
    revision.current++;
    lock.current = false;
    setComment("");
    resetImageState();
    setImageError(null);
    setIsUploadingImage(false);
    setSelectedAccountId(null);
    paymentMutation.reset();
    onClose();
  };

  const hasSelectedAccount =
    !!selectedAccountId &&
    !!sellerAccounts?.some((account) => account.id === selectedAccountId);
  const accountsArePending = isAccountsLoading || isAccountsFetching;
  const canConfirmPayment =
    (!!imageId || !!selectedImage) &&
    hasSelectedAccount &&
    !accountsArePending &&
    !isAccountsError &&
    showPaymentInstructions &&
    !sharedPending &&
    !paymentMutation.isPending &&
    !isUploadingImage;
  latest.current = { order, open, actionsAvailable, selectedAccountId, accountsReady: hasSelectedAccount && !accountsArePending && !isAccountsError };

  useEffect(() => {
    const currentRevision = revision;
    currentRevision.current++;
    lock.current = false;
    setSelectedImage(null); setImagePreview(null); setImageId(null); setImageError(null);
    setIsUploadingImage(false); setComment("");
    const controller = uploadController.current;
    controller?.abort();
    return () => { currentRevision.current++; uploadController.current?.abort(); };
  }, [open, order.orderId, paymentType, scope.signal]);

  const mutationErrorMessage = attempt.verified ? null : mutationApiError?.message;
  const receiptConfirmation = attempt.verified && (
    <Alert severity="success">Заказ №{order.orderId}. Получение отправленного чека подтверждено данными заказа.</Alert>
  );
  const recovery = unresolved && (
    <Alert severity="warning" action={onRetry && <Button disabled={retryPending} onClick={onRetry}>Проверить результат</Button>}>
      Заказ №{order.orderId}. Результат отправки чека неизвестен. Повторная отправка заблокирована. Проверьте состояние заказа.
    </Alert>
  );

  return (
    <>
    {!open && recovery}
    {!open && receiptConfirmation}
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
          <IconButton
            onClick={() => void handleClose()}
            size="small"
            aria-label={`Закрыть окно «${config.title}»`}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {sharedPending && <Alert severity="info">Чек уже отправляется</Alert>}
        {recovery}
        {receiptConfirmation}
        {!actionsAvailable && <Alert severity="warning" action={onRetry && <Button color="inherit" disabled={retryPending} onClick={onRetry}>Повторить загрузку</Button>}>Не удалось обновить заказы. Подтверждение недоступно до успешной загрузки.</Alert>}
        <Typography>Суммы по последнему обновлению заказа. До отправки условия могут измениться.</Typography>
        {paymentBlock && <Alert severity="warning" action={onRetry && <Button disabled={retryPending} onClick={onRetry}>Обновить заказ</Button>}>{paymentBlock}</Alert>}
        {/* Информация о заказе */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, bgcolor: "grey.50" }}>
          <Typography variant="subtitle2" gutterBottom>
            Заказ #{order.orderId}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {order.product.name}
          </Typography>
          <OrderCalculationSummary order={order} />
          {showPaymentInstructions && paymentType === "prepayment" && <Typography>Приложите чек согласованной предоплаты. Если сумма ещё не согласована, уточните её у продавца до перевода.</Typography>}
        </Paper>

        {showPaymentInstructions && (<>
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
        </>)}
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
        <Box hidden={sharedPending || unresolved} sx={{ mb: 3 }}>
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
              !!paymentBlock || !!imageId || isUploadingImage ||
              paymentMutation.isPending ||
              sharedPending || unresolved
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
              {isUploadingImage ? (
                <Stack alignItems="center" spacing={1}>
                  <CircularProgress size={48} />
                  <Typography variant="body2" color="text.secondary">
                    Загрузка изображения...
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
                    {imageId ? "Изображение загружено" : "Файл выбран"}
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

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button disabled={!!imageId || isUploadingImage || paymentMutation.isPending || sharedPending || unresolved} onClick={() => document.getElementById(fileInputId)?.click()}>Выбрать файл</Button>
            {selectedImage && !imageId && <Button disabled={isUploadingImage || paymentMutation.isPending} onClick={() => { resetImageState(); setImageError(null); }}>Удалить выбранный файл</Button>}
          </Stack>

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
          disabled={isUploadingImage || paymentMutation.isPending || sharedPending || unresolved}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => void handleClose()}
          disabled={
            paymentMutation.isPending ||
            isUploadingImage
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
    </>
  );
};
