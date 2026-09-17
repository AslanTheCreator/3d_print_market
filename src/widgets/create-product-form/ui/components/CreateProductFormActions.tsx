"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { FieldErrors } from "react-hook-form";
import type { EditableAvailability, ProductFormData } from "@/entities/product";
import type { ProductFormDraftStatus } from "../../model/productFormDraft";
import { useMobilePublishBar } from "../../model/useMobilePublishBar";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { CheckCircle, CheckCircleOutline, RestartAlt } from "@mui/icons-material";

const SHIPPING_SETTINGS_PATH = "/dashboard/settings?tab=shipping";
const PAYMENT_SETTINGS_PATH = "/dashboard/settings?tab=payment";
const CONTACTS_SETTINGS_PATH = "/dashboard/settings?tab=contacts";

interface RequirementItem {
  actionHref?: string;
  actionLabel?: string;
  done: boolean;
  isLoading?: boolean;
  label: string;
  mobileLabel?: string;
  field?: string;
  mobileOnly?: boolean;
}

interface CreateProductFormActionsProps {
  isFormValid: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  mode?: "create" | "edit";
  onReset: () => void;
  hasFormData: boolean;
  draftStatus: ProductFormDraftStatus;
  draftImageError: boolean;
  isDraftReady: boolean;
  fieldErrors: FieldErrors<ProductFormData>;
  availability: EditableAvailability;
  hasPrepayment: boolean;
  publishRequirements: {
    hasImages: boolean;
    hasCategories: boolean;
    hasCount: boolean;
    hasName: boolean;
    hasPrice: boolean;
    hasSellerAccount: boolean;
    hasSellerSocialNetwork: boolean;
    hasSellerTransfer: boolean;
    isSellerSettingsError: boolean;
    isSellerSettingsLoading: boolean;
  };
}

export const CreateProductFormActions = ({
  isFormValid,
  isPending,
  isSubmitting,
  isUploadingImages,
  mode = "create",
  onReset,
  publishRequirements,
  hasFormData,
  draftStatus,
  draftImageError,
  isDraftReady,
  fieldErrors,
  availability,
  hasPrepayment,
}: CreateProductFormActionsProps) => {
  const theme = useTheme();
  const isEditMode = mode === "edit";
  const [confirmClear, setConfirmClear] = useState(false);
  const cancelClearRef = useRef<HTMLButtonElement>(null);
  const barRef = useMobilePublishBar(!isEditMode);
  const focusField = (id: string) => {
    const field = document.getElementById(id);
    field?.scrollIntoView({ block: "center", behavior: "instant" });
    field?.focus({ preventScroll: true });
  };
  const handleReset = () => {
    if (!isEditMode && hasFormData && window.matchMedia("(max-width: 899.95px)").matches) {
      setConfirmClear(true);
    } else {
      onReset();
    }
  };
  const draftText = !isDraftReady ? "Восстанавливаем черновик…"
    : draftImageError ? "Фото черновика требуют повторной загрузки."
    : isUploadingImages ? "Фото загружаются; черновик пока неполный."
    : draftStatus === "saved" ? "Черновик сохранён в этом браузере"
    : draftStatus === "memory" ? "Не удалось сохранить в браузере. Черновик только в памяти вкладки; при перезагрузке данные потеряются."
    : draftStatus === "error" ? "Не удалось очистить черновик в браузере. После перезагрузки прежние данные могут вернуться."
    : "Черновик появится после ввода данных";

  const productRequirementItems: RequirementItem[] = [
    {
      label: "Добавлено фото",
      done: publishRequirements.hasImages,
      mobileLabel: "Добавить фото",
      field: "product-images",
    },
    {
      label: "Заполнено название",
      done: publishRequirements.hasName,
      mobileLabel: "Заполнить название",
      field: "name",
    },
    {
      label: "Выбрана категория",
      done: publishRequirements.hasCategories,
      mobileLabel: "Выбрать категории",
      field: "product-categories-mobile",
    },
    {
      label: "Указана цена",
      done: publishRequirements.hasPrice,
      mobileLabel: "Указать цену",
      field: "price",
    },
    {
      label: "Указано количество",
      done: publishRequirements.hasCount,
      mobileLabel: "Указать количество",
      field: "count",
    },
  ];

  const sellerRequirementItems: RequirementItem[] = isEditMode
    ? []
    : [
        {
          label: "Настроена доставка",
          done: publishRequirements.hasSellerTransfer,
          isLoading: publishRequirements.isSellerSettingsLoading,
          actionHref: SHIPPING_SETTINGS_PATH,
          actionLabel: "Заполнить",
        },
        {
          label: "Добавлен способ оплаты",
          done: publishRequirements.hasSellerAccount,
          isLoading: publishRequirements.isSellerSettingsLoading,
          actionHref: PAYMENT_SETTINGS_PATH,
          actionLabel: "Заполнить",
        },
        {
          label: "Добавлен контакт для связи",
          done: publishRequirements.hasSellerSocialNetwork,
          isLoading: publishRequirements.isSellerSettingsLoading,
          actionHref: CONTACTS_SETTINGS_PATH,
          actionLabel: "Заполнить",
        },
      ];
  const requirementItems = [
    ...productRequirementItems,
    ...sellerRequirementItems,
  ];
  const mobileExtraItems: RequirementItem[] = [
    ...(availability === "PREORDER" && !hasPrepayment ? [{
      label: "Указать предоплату", done: false, field: "prepaymentAmount", mobileOnly: true,
    }] : []),
    ...Object.entries(fieldErrors).filter(([, error]) => error?.message).map(([field, error]) => ({
      label: String(error?.message), done: false,
      field: field === "categoryIds" ? "product-categories-mobile" : field, mobileOnly: true,
    })),
  ];

  const allRequirementsDone = requirementItems.every((item) => item.done);
  const missingMobileRequirements = requirementItems.filter((item) => !item.done).length + mobileExtraItems.length;
  const hasMissingSellerSettings = sellerRequirementItems.some(
    (item) => !item.done,
  );

  const statusText = isUploadingImages
    ? "Дождитесь завершения загрузки фото."
    : publishRequirements.isSellerSettingsLoading
      ? "Проверяем настройки продавца."
      : publishRequirements.isSellerSettingsError
        ? "Не удалось проверить настройки продавца."
        : hasMissingSellerSettings
          ? "Заполните настройки продавца. Данные товара сохранятся."
          : allRequirementsDone
            ? isEditMode
              ? "Можно сохранить изменения."
              : "Можно опубликовать товар."
            : "Заполните обязательные пункты.";

  return (
    <>
    <Paper
      id="product-publish-readiness"
      tabIndex={-1}
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {isEditMode
                ? "Готовность к сохранению"
                : "Готовность к публикации"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ display: !isEditMode ? { xs: "none", md: "inline" } : "inline" }}>{statusText}</Box>
              {!isEditMode && <Box component="span" sx={{ display: { xs: "inline", md: "none" } }}>
                {draftImageError ? "Повторите загрузку фото черновика."
                  : !isDraftReady ? "Восстанавливаем черновик…"
                  : allRequirementsDone && mobileExtraItems.length > 0 ? "Проверьте обязательные поля."
                  : statusText}
              </Box>}
            </Typography>
          </Box>
          <Chip
            label={`${requirementItems.filter((item) => item.done).length} из ${
              requirementItems.length
            }`}
            color={allRequirementsDone ? "success" : "default"}
            size="small"
            sx={{ fontWeight: 700, display: !isEditMode ? { xs: "none", md: "inline-flex" } : "inline-flex" }}
          />
        </Stack>

        <Stack spacing={1} data-testid="product-readiness">
          {[...requirementItems, ...(!isEditMode ? mobileExtraItems : [])].map((item) => (
            <Stack
              key={item.label}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ display: !isEditMode && item.done ? { xs: "none", md: "flex" } : item.mobileOnly ? { xs: "flex", md: "none" } : "flex" }}
            >
              {item.done ? (
                <CheckCircleOutline
                  sx={{ color: "success.main", fontSize: 18 }}
                />
              ) : (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: alpha(theme.palette.text.primary, 0.32),
                    ml: 0.6,
                    mr: 0.65,
                  }}
                />
              )}
              <Typography
                variant="body2"
                color={item.done ? "text.primary" : "text.secondary"}
                sx={{ display: !isEditMode && item.field ? { xs: "none", md: "block" } : "block" }}
              >
                {item.label}
              </Typography>
              {!isEditMode && item.field && !item.done && (
                <Button type="button" onClick={() => focusField(item.field!)}
                  sx={{ display: { xs: "inline-flex", md: "none" }, minHeight: 44, justifyContent: "flex-start", textAlign: "left", py: 0.5 }}>
                  {item.mobileLabel ?? item.label}
                </Button>
              )}
              {!item.done && item.actionHref && !item.isLoading && (
                isUploadingImages ? (
                  <Button
                    disabled
                    size="small"
                    sx={{ ml: "auto", fontWeight: 600, minWidth: 44, minHeight: !isEditMode ? { xs: 44, md: "auto" } : undefined }}
                  >
                    {item.actionLabel}
                  </Button>
                ) : (
                  <Button
                    component={Link}
                    href={item.actionHref}
                    size="small"
                    sx={{ ml: "auto", fontWeight: 600, minWidth: 44, minHeight: !isEditMode ? { xs: 44, md: "auto" } : undefined }}
                  >
                    {item.actionLabel}
                  </Button>
                )
              )}
            </Stack>
          ))}
        </Stack>

        <Box ref={barRef} data-testid="product-publish-bar" sx={!isEditMode ? {
          position: { xs: "fixed", md: "static" },
          left: 0, right: 0, bottom: "var(--product-keyboard-offset, 0px)",
          zIndex: { xs: theme.zIndex.appBar + 1, md: "auto" },
          px: { xs: "max(16px, env(safe-area-inset-left), env(safe-area-inset-right))", md: 0 },
          pt: { xs: 1, md: 0 },
          pb: { xs: "calc(8px + env(safe-area-inset-bottom))", md: 0 },
          bgcolor: "background.paper",
          borderTop: { xs: "1px solid", md: 0 }, borderColor: "divider",
          boxShadow: { xs: "0 -4px 16px rgba(0,0,0,0.06)", md: "none" },
        } : undefined}>
        {!isEditMode && missingMobileRequirements > 0 && (
          <Button type="button" onClick={() => focusField("product-publish-readiness")}
            sx={{ display: { xs: "flex", md: "none" }, minHeight: 44, mx: "auto", fontSize: 14 }}>
            Что осталось заполнить ({missingMobileRequirements})
          </Button>
        )}
        {!isEditMode && (
          <Typography role="status" data-testid="product-draft-status" variant="caption"
            color={draftStatus === "memory" || draftStatus === "error" || draftImageError ? "warning.main" : "text.secondary"}
            sx={{ display: { xs: "block", md: "none" }, mb: 0.75, lineHeight: 1.4 }}>
            {draftText}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={!isFormValid || isSubmitting}
          startIcon={
            isPending ? <CircularProgress size={18} color="inherit" /> : <CheckCircle />
          }
          sx={{
            minHeight: 48,
            fontWeight: 600,
            borderRadius: 1.5,
            boxShadow: "0 4px 16px rgba(239, 66, 132, 0.22)",
            "&:hover": {
              boxShadow: "0 6px 20px rgba(239, 66, 132, 0.3)",
            },
          }}
        >
          {isPending
            ? isEditMode
              ? "Сохранение..."
              : "Создание..."
            : isUploadingImages
              ? "Загрузка фото..."
              : isEditMode
                ? "Сохранить изменения"
                : "Опубликовать товар"}
        </Button>
        </Box>

        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={handleReset}
          disabled={isSubmitting || !isDraftReady}
          startIcon={<RestartAlt />}
          sx={{
            minHeight: 46,
            fontWeight: 600,
            borderRadius: 1.5,
            ...(!isEditMode && {
              borderWidth: { xs: 0, md: 1 },
              color: { xs: "text.secondary", md: "primary.main" },
              fontWeight: { xs: 400, md: 600 },
              "& .MuiButton-startIcon": { display: { xs: "none", md: "inline-flex" } },
              "&:hover": { borderWidth: { xs: 0, md: 1 } },
            }),
          }}
        >
          {isEditMode ? "Сбросить изменения" : "Очистить форму"}
        </Button>
      </Stack>
    </Paper>
    <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}
      TransitionProps={{ onEntered: () => cancelClearRef.current?.focus() }}
      aria-labelledby="clear-product-title" aria-describedby="clear-product-description">
      <DialogTitle id="clear-product-title">Очистить форму?</DialogTitle>
      <DialogContent>
        <DialogContentText id="clear-product-description">Введённые данные и фото будут убраны из формы, а локальный черновик — удалён.</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button ref={cancelClearRef} autoFocus onClick={() => setConfirmClear(false)} sx={{ minHeight: 48 }}>Отмена</Button>
        <Button color="error" variant="contained" disabled={isSubmitting} onClick={() => { onReset(); setConfirmClear(false); }} sx={{ minHeight: 48 }}>Очистить</Button>
      </DialogActions>
    </Dialog>
    </>
  );
};
