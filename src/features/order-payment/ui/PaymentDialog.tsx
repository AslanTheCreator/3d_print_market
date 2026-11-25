"use client";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  Paper,
  CircularProgress,
  FormHelperText,
} from "@mui/material";
import { Close, CloudUpload, Payment, CheckCircle } from "@mui/icons-material";
import {
  OrderCalculationSummary, OrderDeliverySnapshot, hasTermsVersion,
  getOrderPaymentBreakdown,
  type ListOrdersModel,
} from "@/entities/order";
import { useSellerAccounts } from "@/entities/account";
import { usePrivateScope } from "@/shared/lib/query";
import { paymentTerms } from "../model/paymentEvidence";
import {
  createImagePreview,
  revokeImagePreview,
  validateImage,
} from "@/shared/lib";
import { SellerPaymentDetails } from "./SellerPaymentDetails";
import { useCustomerPaymentAttempt } from "../model/useCustomerPaymentAttempt";
import { DisputePaymentDialog, type DisputePaymentDialogProps } from "./DisputePaymentDialog";

// ─────────────────────────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentType = "payment" | "prepayment" | "dispute";

interface PaymentDialogProps {
  open: boolean;
  actionsAvailable?: boolean;
  onRetry?: () => void;
  retryPending?: boolean;
  onClose: () => void;
  order: ListOrdersModel;
  paymentType: Exclude<PaymentType, "dispute">;
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
}: PaymentDialogProps) => {
  const [seenTerms, setSeenTerms] = useState("");
  const [selection, setSelection] = useState<{ file: File; version: number; preview: string } | null>(null);
  const imagePreview = selection?.preview;
  const [imageError, setImageError] = useState<string | null>(null);
  const scope = usePrivateScope();
  const revision = useRef(0);
  const attempt = useCustomerPaymentAttempt(order, paymentType === "payment" ? "full" : "prepayment", open, actionsAvailable);
  const state = attempt.state;
  const sharedPending = !!state?.busy;
  const unresolved = state?.phase === "unknown" || state?.phase === "accepted" || !!state?.needsRead;
  const isUploadingImage = state?.phase === "uploading";
  const returnedVersion = attempt.returned?.expectedVersion;
  const expiredFile = !!selection && returnedVersion !== undefined && selection.version <= returnedVersion;
  const expiredDraft = !!state?.imageId && !!attempt.returned && (state.imageId === attempt.returned.imageId ||
    (returnedVersion !== undefined && state.proofVersion !== undefined && state.proofVersion <= returnedVersion));
  const selectedImage = expiredFile ? null : selection?.file ?? null;
  const imageId = expiredDraft ? undefined : state?.imageId;
  const fingerprint = paymentTerms(order);
  const changed = seenTerms !== fingerprint;
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

  const config = paymentConfig[paymentType];
  const paymentBreakdown = getOrderPaymentBreakdown(order);
  const paymentBlock = paymentType === "prepayment" ? paymentBreakdown.prepaymentBlock : paymentBreakdown.paymentBlock;
  const expectedOrderStatus =
    paymentType === "prepayment"
      ? "AWAITING_PREPAYMENT"
      : "AWAITING_PAYMENT";
  const isExpectedOrderStatus = order.actualStatus === expectedOrderStatus;
  const showPaymentInstructions = actionsAvailable && isExpectedOrderStatus && !paymentBlock && !unresolved && !sharedPending && attempt.canSubmit;
  const formId = useId();
  const fileInputId = formId + "-proof";

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
  } = useSellerAccounts(open && paymentType === "payment" && isExpectedOrderStatus && !paymentBlock && !unresolved ? order.userInfo.id : undefined);

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
    setSelection(null);
    setImageError(null);
    attempt.discard();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!isExpectedOrderStatus || !hasTermsVersion(order.termsVersion) || attempt.staleVersion || !file || imageId || paymentBlock || sharedPending || unresolved || attempt.otherBlocked || !scope.isCurrent()) return;
    const validation = validateImage(file);
    if (!validation.isValid) {
      setImageError(validation.error ?? "Invalid image");
      return;
    }
    setImageError(null);
    attempt.discard();
    setSelection({ file, version: order.termsVersion, preview: createImagePreview(file) });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Подтверждение оплаты
  // ──────────────────────────────────────────────────────────────────────────

  const accountsArePending = isAccountsLoading || isAccountsFetching;
  const accountsReady = paymentType === "prepayment" || (!!selectedAccountId && !accountsArePending && !isAccountsError &&
    !!sellerAccounts?.some(account => account.id === selectedAccountId));
  const canConfirmPayment = (!!imageId || !!selectedImage) && accountsReady && attempt.canSubmit && !changed &&
    !sharedPending && !unresolved && !attempt.otherBlocked;
  const latest = useRef(false);
  useLayoutEffect(() => { latest.current = open && actionsAvailable && accountsReady && isExpectedOrderStatus && !changed; },
    [open, actionsAvailable, accountsReady, isExpectedOrderStatus, changed]);
  const handleConfirmPayment = () => {
    if (!canConfirmPayment || !open) return;
    const generation = revision.current;
    void attempt.submit(selectedImage, imageId, imageId ? state?.proofVersion : selection?.version, () => latest.current && revision.current === generation);
  };
  const handleClose = () => {
    if (sharedPending) return;
    revision.current++;
    onClose();
  };
  const openingTerms = useRef(fingerprint);
  useLayoutEffect(() => { openingTerms.current = imageId && state ? state.terms : fingerprint; }, [imageId, state, fingerprint]);
  useLayoutEffect(() => {
    const sessionRevision = revision;
    sessionRevision.current++;
    setSeenTerms(openingTerms.current);
    setSelection(null); setImageError(null); setSelectedAccountId(null);
    return () => { sessionRevision.current++; };
  }, [open, order.orderId, paymentType, scope.signal, attempt.actor]);
  const verified = state?.phase === "verified";
  if (selection && (expiredFile || verified)) setSelection(null);
  const discard = attempt.discard;
  useEffect(() => {
    if (expiredDraft && !sharedPending && !unresolved) discard(state?.token);
  }, [discard, expiredDraft, sharedPending, unresolved, state?.token]);
  useEffect(() => {
    if (state?.phase === "verified" && open && !isExpectedOrderStatus) onClose();
  }, [state?.phase, open, isExpectedOrderStatus, onClose]);
  const receiptConfirmation = verified && state.verifiedVersion === order.termsVersion && (
    <Alert severity="success">Заказ №{order.orderId}. {state.message}</Alert>
  );
  const recovery = unresolved && (
    <Alert severity="warning" action={<Button disabled={sharedPending} onClick={attempt.recheck}>Проверить результат</Button>}>
      Заказ №{order.orderId}. <span>{state?.message}</span> {state?.needsRead && "Требуется контрольная проверка заказа и истории."}
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
            disabled={sharedPending}
            aria-label={`Закрыть окно «${config.title}»`}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <form id={formId} onSubmit={event => { event.preventDefault(); handleConfirmPayment(); }}>
        {attempt.staleVersion && <Alert severity="warning" action={<Button disabled={retryPending} onClick={() => { onRetry?.(); attempt.refreshHistory(); }}>Обновить заказ</Button>}>Получена устаревшая версия заказа. Предъявление чека заблокировано.</Alert>}
        {attempt.hasOpenCase && <Alert severity="warning">По заказу открыто обращение. Предъявление чека недоступно.</Alert>}
        {attempt.otherBlocked && <Alert severity="warning">Проверьте результат предыдущего предъявления чека по этому заказу.</Alert>}
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
          {order.calculation && <OrderCalculationSummary order={order} />}
          {showPaymentInstructions && paymentType === "prepayment" && <Typography>Приложите чек согласованной предоплаты. Сумма совершённого перевода должна быть согласована с продавцом.</Typography>}
        </Paper>

        {showPaymentInstructions && paymentType === "payment" && (<>
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
        {!unresolved && !(changed && state?.phase === "draft") && state?.message && state.phase !== "verified" && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {state.message}
          </Alert>
        )}

        {!isExpectedOrderStatus && (
          <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
            Статус заказа уже обновился. Закройте диалог и проверьте актуальный
            этап заказа.
          </Alert>
        )}

        {attempt.returned && <Alert severity="info">Причина возврата чека: {attempt.returned.reason}</Alert>}
        {changed && isExpectedOrderStatus && <Alert severity="warning" action={<Button disabled={sharedPending || unresolved}
          onClick={() => setSeenTerms(fingerprint)}>Чек соответствует новым условиям</Button>}>
          Условия заказа изменились. Проверьте новый расчёт и соответствие выбранного чека.
          <OrderDeliverySnapshot order={order} />
        </Alert>}
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
              !isExpectedOrderStatus || attempt.staleVersion || !!imageId || !!paymentBlock || sharedPending || unresolved
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
              ) : imagePreview || imageId ? (
                <Box>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imagePreview && <img
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
                  />}
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
            {imageId ? (
              <Button disabled={sharedPending || unresolved} onClick={resetImageState}>Выбрать другой чек</Button>
            ) : (
              <>
                <Button disabled={!isExpectedOrderStatus || attempt.staleVersion || sharedPending || unresolved} onClick={() => document.getElementById(fileInputId)?.click()}>Выбрать файл</Button>
                {selectedImage && <Button disabled={sharedPending} onClick={resetImageState}>Удалить выбранный файл</Button>}
              </>
            )}
          </Stack>

          {imageError && (
            <FormHelperText error sx={{ mt: 1 }}>
              {imageError}
            </FormHelperText>
          )}
        </Box>

        </form>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => void handleClose()}
          disabled={sharedPending}
        >
          Отмена
        </Button>
        <Button
          type="submit"
          form={formId}
          variant="contained"
          disabled={!canConfirmPayment}
          startIcon={sharedPending ? null : <Payment />}
        >
          {sharedPending
            ? config.buttonLoadingText
            : config.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};
