"use client";

import { useEffect, useId, useState } from "react";
import {
  Alert, Box, Button, ButtonBase, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, IconButton, Radio, RadioGroup,
  Skeleton, Stack, Typography, alpha,
} from "@mui/material";
import { ChevronRight, Close, LocalShippingOutlined } from "@mui/icons-material";
import { useDictionary } from "@/entities/dictionary";
import { getDeliveryIcon, type Transfer } from "@/entities/transfer";
import { formatPrice } from "@/shared/lib";
import type { SellerCheckoutGroup } from "../model/types";

interface SellerDeliverySelectorProps {
  group: SellerCheckoutGroup;
  onSelect: (sellerId: number, transfer: Transfer) => void;
  onRetry: (sellerId: number) => void;
}

const transferPrice = (transfer: Transfer) =>
  transfer.price === 0 ? "Бесплатно" : formatPrice(transfer.price, transfer.currency);

export const SellerDeliverySelector = ({ group, onSelect, onRetry }: SellerDeliverySelectorProps) => {
  const { data: shoppingMethods } = useDictionary("SHOPPING_METHODS");
  const [isOpen, setIsOpen] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const canChoose = group.isActive && !group.isLoading && !group.isError && group.transfers.length > 1;
  const draftTransfer = group.transfers.find((transfer) => transfer.id === draftId);
  const methodLabel = (transfer: Transfer) =>
    shoppingMethods?.find((method) => method.value === transfer.sending)?.description || transfer.sending;

  useEffect(() => {
    if (!canChoose) setIsOpen(false);
  }, [canChoose]);

  if (!group.isActive) {
    return (
      <Typography variant="body2" color="text.secondary">
        Выберите хотя бы один товар продавца, чтобы настроить доставку.
      </Typography>
    );
  }

  if (group.isLoading) {
    return (
      <Box aria-busy="true" aria-label="Загрузка доставки">
        <Skeleton variant="rounded" height={72} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (group.isError) {
    return (
      <Alert severity="error" sx={{ "& .MuiAlert-message": { minWidth: 0 } }}>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
          {group.errorMessage || "Не удалось загрузить способы доставки"}
        </Typography>
        <Button color="inherit" size="small" onClick={() => onRetry(group.sellerId)} sx={{ mt: 0.5 }}>
          Повторить
        </Button>
      </Alert>
    );
  }

  if (group.transfers.length === 0) {
    return (
      <Alert severity="warning">
        У продавца нет доступных способов доставки. Исключите его товары из
        заказа, чтобы оформить остальные.
      </Alert>
    );
  }

  const selectedTransfer = group.selectedTransfer;
  const rowContent = (
    <>
      <Box component="span" sx={{ display: "flex", color: "text.secondary", flexShrink: 0 }}>
        {selectedTransfer ? getDeliveryIcon(selectedTransfer.sending) : <LocalShippingOutlined />}
      </Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block" }}>
          Доставка
        </Typography>
        <Typography component="span" variant="body2" fontWeight={600} sx={{ display: "block", overflowWrap: "anywhere" }}>
          {selectedTransfer ? methodLabel(selectedTransfer) : "Выберите способ"}
        </Typography>
      </Box>
      {selectedTransfer && (
        <Typography component="span" variant="body2" fontWeight={600} sx={{ maxWidth: "40%", overflowWrap: "anywhere", textAlign: "right" }}>
          {transferPrice(selectedTransfer)}
        </Typography>
      )}
      {canChoose && <ChevronRight sx={{ flexShrink: 0, color: "text.secondary" }} />}
    </>
  );
  const rowSx = {
    display: "flex", alignItems: "center", gap: 1.5, width: "100%",
    minHeight: 72, p: 1.5, borderRadius: 2, textAlign: "left",
    bgcolor: "action.hover",
  } as const;

  return (
    <>
      {canChoose ? (
        <ButtonBase
          data-testid={`checkout-delivery-trigger-${group.sellerId}`}
          aria-label={`Доставка от ${group.sellerLogin}: ${selectedTransfer ? `${methodLabel(selectedTransfer)}, ${transferPrice(selectedTransfer)}` : "выберите способ"}`}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={() => {
            setDraftId(group.selectedTransfer?.id ?? null);
            setIsOpen(true);
          }}
          sx={{
            ...rowSx,
            "&:hover": { bgcolor: "action.selected" },
            "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
          }}
        >
          {rowContent}
        </ButtonBase>
      ) : (
        <Box data-testid={`checkout-delivery-summary-${group.sellerId}`} sx={rowSx}>
          {rowContent}
        </Box>
      )}

      <Dialog
        open={isOpen && canChoose}
        onClose={() => setIsOpen(false)}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        maxWidth={false}
        sx={{ "& .MuiDialog-container": { alignItems: { xs: "flex-end", md: "center" } } }}
        PaperProps={{
          sx: {
            m: { xs: 0, md: 4 }, width: { xs: "100%", md: 480 },
            maxWidth: { xs: "100%", md: 480 }, maxHeight: "calc(100dvh - 24px)",
            borderRadius: { xs: "16px 16px 0 0", md: "16px" },
          },
        }}
      >
        <DialogTitle id={`${titleId}-container`} component="div" sx={{ px: 2, py: 1.5, display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0, pt: 0.5 }}>
            <Typography id={titleId} component="h2" variant="h6" fontWeight={600}>Способ доставки</Typography>
            <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              От продавца {group.sellerLogin}
            </Typography>
          </Box>
          <IconButton aria-label="Отменить выбор доставки" onClick={() => setIsOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2, pb: 2, "&&": { pt: 1 } }}>
          <RadioGroup aria-labelledby={titleId} value={draftId === null ? "" : String(draftId)} onChange={(event) => setDraftId(Number(event.target.value))}>
            <Stack spacing={1}>
              {group.transfers.map((transfer) => (
                <FormControlLabel
                  key={transfer.id}
                  data-testid={`checkout-delivery-${group.sellerId}-${transfer.id}`}
                  value={String(transfer.id)}
                  control={<Radio sx={{ "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main" } }} />}
                  label={
                    <Box component="span" sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 0.5 }}>
                      <Typography component="span" variant="body2" fontWeight={600} sx={{ flex: "1 1 150px", overflowWrap: "anywhere" }}>
                        {methodLabel(transfer)}
                      </Typography>
                      <Typography component="span" variant="body2" color="text.secondary">
                        {transferPrice(transfer)}
                      </Typography>
                    </Box>
                  }
                  sx={{
                    m: 0, pr: 1.5, py: 1, minHeight: 72, border: "1px solid", borderRadius: 2,
                    borderColor: draftId === transfer.id ? "primary.main" : "divider",
                    bgcolor: (theme) => draftId === transfer.id ? alpha(theme.palette.primary.main, 0.04) : "transparent",
                    "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 },
                  }}
                />
              ))}
            </Stack>
          </RadioGroup>
        </DialogContent>
        <DialogActions sx={{ px: 2, pt: 1, pb: "max(16px, env(safe-area-inset-bottom))", borderTop: "1px solid", borderColor: "divider" }}>
          <Button onClick={() => setIsOpen(false)} sx={{ flex: 1 }}>Отмена</Button>
          <Button
            variant="contained" disabled={!draftTransfer} sx={{ flex: 1 }}
            onClick={() => {
              if (draftTransfer) {
                onSelect(group.sellerId, draftTransfer);
                setIsOpen(false);
              }
            }}
          >
            Применить
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
