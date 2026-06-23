import type React from "react";
import { Box, Button, Paper, Popper, Stack } from "@mui/material";
import { PriceInput } from "./PriceInput";

interface PriceRangeDesktopPanelProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  popoverPaperRef: React.RefObject<HTMLDivElement | null>;
  minPriceInput: string;
  maxPriceInput: string;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onMouseEnter: () => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: () => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
}

export const PriceRangeDesktopPanel = ({
  open,
  anchorEl,
  popoverPaperRef,
  minPriceInput,
  maxPriceInput,
  onMinPriceChange,
  onMaxPriceChange,
  onApply,
  onReset,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: PriceRangeDesktopPanelProps): React.ReactElement => {
  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
      modifiers={[
        {
          name: "offset",
          options: {
            offset: [0, 8],
          },
        },
      ]}
    >
      <Box
        ref={popoverPaperRef}
        tabIndex={-1}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        sx={{
          position: "relative",
          display: "inline-block",
          "&::before": {
            content: '""',
            position: "absolute",
            top: -8,
            left: 0,
            right: 0,
            height: 8,
          },
        }}
      >
        <Paper
          sx={{
            p: 2,
            width: 372,
            borderRadius: 3,
            border: "1px solid",
            borderColor: "#e1e6ef",
            boxShadow: "0 18px 46px rgba(20, 24, 40, 0.14)",
          }}
        >
          <Stack spacing={2}>
            <Stack direction="row" spacing={1.5}>
              <PriceInput
                label="От"
                value={minPriceInput}
                onChange={onMinPriceChange}
                onSubmit={onApply}
              />
              <PriceInput
                label="До"
                value={maxPriceInput}
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
          </Stack>
        </Paper>
      </Box>
    </Popper>
  );
};
