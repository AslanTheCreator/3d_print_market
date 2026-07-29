import type React from "react";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alpha, Box, Button } from "@mui/material";

interface PriceRangeTriggerProps {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  label: string;
  hasActiveValue: boolean;
  isOpen: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClearIndicatorClick: (event: React.MouseEvent<HTMLElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: (event: React.MouseEvent<HTMLElement>) => void;
  onFocus: (event: React.FocusEvent<HTMLElement>) => void;
  onBlur: (event: React.FocusEvent<HTMLElement>) => void;
}

export const PriceRangeTrigger = ({
  wrapperRef,
  triggerRef,
  label,
  hasActiveValue,
  isOpen,
  onClick,
  onClearIndicatorClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
}: PriceRangeTriggerProps): React.ReactElement => {
  return (
    <Box
      ref={wrapperRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      sx={{ display: "inline-flex" }}
    >
      <Button
        data-testid="price-range-trigger"
        ref={triggerRef}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-expanded={isOpen}
        endIcon={
          hasActiveValue ? (
            <Box
              onClick={onClearIndicatorClick}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: "50%",
                color: "primary.main",
                transition: "background-color 0.2s ease",
                "&:hover": {
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </Box>
          ) : (
            <ExpandMoreIcon
              sx={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          )
        }
        sx={{
          minWidth: 0,
          px: 2,
          py: 1.25,
          borderRadius: 3,
          color: hasActiveValue ? "primary.main" : "text.primary",
          bgcolor: hasActiveValue
            ? (theme) => alpha(theme.palette.primary.main, 0.1)
            : isOpen
              ? "background.paper"
              : "#e9edf3",
          border: "1px solid",
          borderColor: hasActiveValue
            ? (theme) => alpha(theme.palette.primary.main, 0.18)
            : isOpen
              ? "divider"
              : "#e1e6ef",
          boxShadow:
            isOpen || hasActiveValue
              ? "0 10px 26px rgba(27, 32, 50, 0.08)"
              : "none",
          fontSize: 16,
          fontWeight: hasActiveValue ? 600 : 500,
          lineHeight: 1.2,
          textTransform: "none",
          "&:hover": {
            bgcolor: hasActiveValue
              ? (theme) => alpha(theme.palette.primary.main, 0.14)
              : "#e2e7ef",
            boxShadow: "0 10px 26px rgba(27, 32, 50, 0.08)",
          },
          "& .MuiButton-endIcon": {
            ml: 0.75,
          },
        }}
      >
        <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
          Цена
        </Box>
        <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
          {label}
        </Box>
      </Button>
    </Box>
  );
};
