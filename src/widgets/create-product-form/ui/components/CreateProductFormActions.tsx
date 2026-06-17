"use client";

import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
}

interface CreateProductFormActionsProps {
  isFormValid: boolean;
  isPending: boolean;
  isSubmitting: boolean;
  isUploadingImages: boolean;
  mode?: "create" | "edit";
  onReset: () => void;
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
}: CreateProductFormActionsProps) => {
  const theme = useTheme();
  const isEditMode = mode === "edit";

  const productRequirementItems: RequirementItem[] = [
    {
      label: "Добавлено фото",
      done: publishRequirements.hasImages,
    },
    {
      label: "Заполнено название",
      done: publishRequirements.hasName,
    },
    {
      label: "Выбрана категория",
      done: publishRequirements.hasCategories,
    },
    {
      label: "Указана цена",
      done: publishRequirements.hasPrice,
    },
    {
      label: "Указано количество",
      done: publishRequirements.hasCount,
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

  const allRequirementsDone = requirementItems.every((item) => item.done);
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
    <Paper
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
            <Typography variant="subtitle1" fontWeight={800}>
              {isEditMode
                ? "Готовность к сохранению"
                : "Готовность к публикации"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {statusText}
            </Typography>
          </Box>
          <Chip
            label={`${requirementItems.filter((item) => item.done).length} из ${
              requirementItems.length
            }`}
            color={allRequirementsDone ? "success" : "default"}
            size="small"
            sx={{ fontWeight: 800 }}
          />
        </Stack>

        <Stack spacing={1}>
          {requirementItems.map((item) => (
            <Stack
              key={item.label}
              direction="row"
              alignItems="center"
              spacing={1}
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
              >
                {item.label}
              </Typography>
              {!item.done && item.actionHref && !item.isLoading && (
                isUploadingImages ? (
                  <Button
                    disabled
                    size="small"
                    sx={{ ml: "auto", fontWeight: 700, minWidth: 0 }}
                  >
                    {item.actionLabel}
                  </Button>
                ) : (
                  <Button
                    component={Link}
                    href={item.actionHref}
                    size="small"
                    sx={{ ml: "auto", fontWeight: 700, minWidth: 0 }}
                  >
                    {item.actionLabel}
                  </Button>
                )
              )}
            </Stack>
          ))}
        </Stack>

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
            fontWeight: 800,
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

        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={onReset}
          disabled={isSubmitting}
          startIcon={<RestartAlt />}
          sx={{
            minHeight: 46,
            fontWeight: 700,
            borderRadius: 1.5,
          }}
        >
          {isEditMode ? "Сбросить изменения" : "Очистить форму"}
        </Button>
      </Stack>
    </Paper>
  );
};
