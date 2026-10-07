import type React from "react";
import { Button, Popover, Stack } from "@mui/material";
import { PriceInput } from "./PriceInput";

interface PriceRangeDesktopPanelProps {
  open: boolean;
  anchorEl: HTMLElement | null;
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

export const PriceRangeDesktopPanel = ({
  open,
  anchorEl,
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
}: PriceRangeDesktopPanelProps): React.ReactElement => {
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      PaperProps={{
        id: surfaceId,
        role: "dialog",
        "aria-label": "Цена",
        "aria-modal": true,
        sx: {
          mt: 1,
          p: 2,
          width: 372,
          maxWidth: "calc(100vw - 32px)",
          borderRadius: 3,
          border: "1px solid",
          borderColor: "#e1e6ef",
          boxShadow: "0 18px 46px rgba(20, 24, 40, 0.14)",
        },
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5}>
          <PriceInput
            label="От"
            autoFocus
            placeholder={minPricePlaceholder}
            value={minPriceInput}
            error={minPriceError}
            onChange={onMinPriceChange}
            onSubmit={onApply}
          />
          <PriceInput
            label="До"
            placeholder={maxPricePlaceholder}
            value={maxPriceInput}
            error={maxPriceError}
            onChange={onMaxPriceChange}
            onSubmit={onApply}
          />
        </Stack>

        <Stack direction="row" spacing={1.5}>
          <Button
            fullWidth
            onClick={onReset}
            sx={{
              minHeight: 44,
              borderRadius: 2.5,
              bgcolor: "#eef1f5",
              color: "text.primary",
              fontSize: 16,
              fontWeight: 700,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#e4e8ef",
              },
            }}
          >
            Сбросить
          </Button>

          <Button
            fullWidth
            onClick={onApply}
            sx={{
              minHeight: 44,
              borderRadius: 2.5,
              color: "common.white",
              fontSize: 16,
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
      </Stack>
    </Popover>
  );
};
