"use client";

import React from "react";
import {
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
  Rating,
  Alert,
  CircularProgress,
  Fade,
  Grow,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import {
  Close,
  Star,
  RateReview,
  CheckCircleOutline,
} from "@mui/icons-material";
import { Controller } from "react-hook-form";
import { Product } from "@/shared/types";
import { useLeaveReview } from "../model/useLeaveReview";
import { REVIEW_VALIDATION, REVIEW_FORM_RULES } from "../model/types";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface LeaveReviewDialogProps {
  orderId: number;
  product: Product;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating Labels
// ─────────────────────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: "Ужасно",
  2: "Плохо",
  3: "Нормально",
  4: "Хорошо",
  5: "Отлично",
};

// ─────────────────────────────────────────────────────────────────────────────
// Success State (внутри диалога)
// ─────────────────────────────────────────────────────────────────────────────

const SuccessState: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: { xs: 4, sm: 6 },
        px: 2,
        textAlign: "center",
      }}
    >
      <Grow in timeout={600}>
        <Box
          sx={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            bgcolor: alpha(theme.palette.success.main, 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <CheckCircleOutline
            sx={{ fontSize: 48, color: theme.palette.success.main }}
          />
        </Box>
      </Grow>

      <Fade in timeout={800}>
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="h5" fontWeight={700}>
            Спасибо за отзыв!
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 300, lineHeight: 1.6 }}
          >
            Ваш отзыв поможет другим покупателям сделать правильный выбор.
          </Typography>
        </Stack>
      </Fade>

      <Fade in timeout={1000}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ mt: 4, minWidth: 160 }}
        >
          Закрыть
        </Button>
      </Fade>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Product Header (превью товара)
// ─────────────────────────────────────────────────────────────────────────────

const ProductHeader: React.FC<{ product: Product }> = ({ product }) => {
  const theme = useTheme();

  // Получаем base64 изображение товара
  const productImage = product.image?.[0];
  const imageSrc = productImage
    ? `data:${productImage.contentType};base64,${productImage.imageData}`
    : null;

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      {/* Миниатюра товара */}
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 1.5,
          overflow: "hidden",
          flexShrink: 0,
          bgcolor: "grey.100",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt={product.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RateReview
              sx={{ fontSize: 24, color: theme.palette.text.disabled }}
            />
          </Box>
        )}
      </Box>

      {/* Название товара */}
      <Typography
        variant="subtitle2"
        fontWeight={600}
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          lineHeight: 1.4,
        }}
      >
        {product.name}
      </Typography>
    </Stack>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const LeaveReviewDialog: React.FC<LeaveReviewDialogProps> = ({
  orderId,
  product,
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { dialogState, form, handleSubmit, isPending, isError, closeDialog } =
    useLeaveReview({
      orderId,
      onSuccess,
    });

  const {
    control,
    watch,
    formState: { errors },
  } = form;
  const currentRating = watch("rating");

  // Закрытие через пропс + хук
  const handleClose = () => {
    closeDialog();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={dialogState === "form" ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
        },
      }}
    >
      {/* ── Success State ── */}
      {dialogState === "success" && <SuccessState onClose={handleClose} />}

      {/* ── Form State ── */}
      {dialogState === "form" && (
        <>
          {/* Header */}
          <DialogTitle sx={{ pb: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <RateReview color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Оставить отзыв
                </Typography>
              </Stack>
              <IconButton onClick={handleClose} size="small">
                <Close />
              </IconButton>
            </Stack>
          </DialogTitle>

          <DialogContent sx={{ pb: 1 }}>
            <Stack spacing={3}>
              {/* Информация о товаре */}
              <ProductHeader product={product} />

              {/* Рейтинг */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Ваша оценка
                </Typography>

                <Controller
                  name="rating"
                  control={control}
                  rules={REVIEW_FORM_RULES.rating}
                  render={({ field }) => (
                    <Stack spacing={1}>
                      <Rating
                        value={field.value}
                        onChange={(_, newValue) => {
                          field.onChange(newValue ?? 0);
                        }}
                        size="large"
                        icon={
                          <Star
                            sx={{
                              fontSize: { xs: 36, sm: 40 },
                              color: "warning.main",
                            }}
                          />
                        }
                        emptyIcon={
                          <Star
                            sx={{
                              fontSize: { xs: 36, sm: 40 },
                              color: "grey.300",
                            }}
                          />
                        }
                      />

                      {/* Текстовое описание оценки */}
                      <Box sx={{ minHeight: 24 }}>
                        {currentRating > 0 && (
                          <Fade in>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              fontWeight={500}
                            >
                              {RATING_LABELS[currentRating]}
                            </Typography>
                          </Fade>
                        )}
                      </Box>

                      {/* Ошибка валидации */}
                      {errors.rating && (
                        <Typography variant="caption" color="error">
                          {errors.rating.message}
                        </Typography>
                      )}
                    </Stack>
                  )}
                />
              </Box>

              {/* Комментарий */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Комментарий
                </Typography>

                <Controller
                  name="comment"
                  control={control}
                  rules={REVIEW_FORM_RULES.comment}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Расскажите о своих впечатлениях..."
                      error={!!errors.comment}
                      helperText={
                        errors.comment?.message ??
                        `${field.value.length}/${REVIEW_VALIDATION.COMMENT_MAX_LENGTH}`
                      }
                      inputProps={{
                        maxLength: REVIEW_VALIDATION.COMMENT_MAX_LENGTH,
                      }}
                      disabled={isPending}
                    />
                  )}
                />
              </Box>

              {/* Ошибка отправки */}
              {isError && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  Не удалось отправить отзыв. Попробуйте ещё раз.
                </Alert>
              )}
            </Stack>
          </DialogContent>

          {/* Actions */}
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleClose} disabled={isPending}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isPending || currentRating === 0}
              startIcon={
                isPending ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <RateReview />
                )
              }
            >
              {isPending ? "Отправка..." : "Отправить отзыв"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};
