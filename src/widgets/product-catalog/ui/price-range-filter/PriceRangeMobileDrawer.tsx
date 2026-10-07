import type React from "react";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { PriceInput } from "./PriceInput";

interface PriceRangeMobileDrawerProps {
  open: boolean;
  surfaceId: string;
  minPricePlaceholder: string;
  maxPricePlaceholder: string;
  minPriceInput: string;
  maxPriceInput: string;
  minPriceError?: string;
  maxPriceError?: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const PriceRangeMobileDrawer = ({
  open,
  surfaceId,
  minPricePlaceholder,
  maxPricePlaceholder,
  minPriceInput,
  maxPriceInput,
  minPriceError,
  maxPriceError,
  onMinPriceChange,
  onMaxPriceChange,
  onApply,
  onReset,
  onClose,
}: PriceRangeMobileDrawerProps): React.ReactElement => {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{ id: surfaceId, role: "dialog", "aria-modal": true, "aria-label": "Цена" }}
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        "& .MuiDrawer-paper": {
          height: "auto",
          maxHeight: "100dvh",
          boxSizing: "border-box",
          overflowY: "auto",
          borderRadius: "24px 24px 0 0",
          px: 2,
          pt: 1.25,
          pb: 2,
        },
      }}
    >
      <Stack spacing={1.25} sx={{ flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: "wrap" }}>
          <Typography variant="h5" fontWeight={700}>
            Цена
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              onClick={onReset}
              sx={{
                minWidth: 0,
                minHeight: 44,
                px: 0.75,
                color: "text.secondary",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "underline",
                textDecorationStyle: "dashed",
                textUnderlineOffset: "4px",
                textTransform: "none",
              }}
            >
              Сбросить
            </Button>

            <IconButton onClick={onClose} aria-label="Закрыть" sx={{ width: 44, height: 44 }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.25}>
          <PriceInput
            label="От"
            autoFocus
            placeholder={minPricePlaceholder}
            value={minPriceInput}
            error={minPriceError}
            onChange={onMinPriceChange}
            onSubmit={onApply}
            compact
          />
          <PriceInput
            label="До"
            placeholder={maxPricePlaceholder}
            value={maxPriceInput}
            error={maxPriceError}
            onChange={onMaxPriceChange}
            onSubmit={onApply}
            compact
          />
        </Stack>

        <Button
          fullWidth
          onClick={onApply}
          sx={{
            minHeight: 44,
            borderRadius: 2.5,
            color: "common.white",
            fontSize: "0.9375rem",
            fontWeight: 700,
            textTransform: "none",
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.dark} 0%, ${theme.palette.accent.primary} 100%)`,
            "&:hover": {
              background: (theme) =>
                `linear-gradient(90deg, ${theme.palette.accent.primary} 0%, ${theme.palette.accent.primary} 100%)`,
            },
          }}
        >
          Готово
        </Button>
      </Stack>
    </Drawer>
  );
};
