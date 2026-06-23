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
  minPriceInput: string;
  maxPriceInput: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const PriceRangeMobileDrawer = ({
  open,
  minPriceInput,
  maxPriceInput,
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
      ModalProps={{
        keepMounted: true,
      }}
      sx={{
        "& .MuiDrawer-paper": {
          height: "189.2px",
          boxSizing: "border-box",
          overflow: "hidden",
          borderRadius: "24px 24px 0 0",
          px: 2,
          pt: 1.25,
          pb: 2,
        },
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" fontWeight={700}>
            Цена
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              onClick={onReset}
              sx={{
                minWidth: 0,
                px: 0.75,
                color: "text.secondary",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "underline",
                textDecorationStyle: "dashed",
                textUnderlineOffset: "4px",
                textTransform: "none",
              }}
            >
              Сбросить
            </Button>

            <IconButton onClick={onClose} aria-label="Закрыть">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.25}>
          <PriceInput
            label="От"
            value={minPriceInput}
            onChange={onMinPriceChange}
            onSubmit={onApply}
            compact
          />
          <PriceInput
            label="До"
            value={maxPriceInput}
            onChange={onMaxPriceChange}
            onSubmit={onApply}
            compact
          />
        </Stack>

        <Button
          fullWidth
          onClick={onApply}
          sx={{
            minHeight: 42,
            borderRadius: 2.5,
            color: "common.white",
            fontSize: 15,
            fontWeight: 700,
            textTransform: "none",
            background: (theme) =>
              `linear-gradient(90deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
            "&:hover": {
              background: (theme) =>
                `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            },
          }}
        >
          Готово
        </Button>
      </Stack>
    </Drawer>
  );
};
