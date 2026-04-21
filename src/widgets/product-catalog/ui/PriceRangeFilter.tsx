"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  alpha,
  Box,
  Button,
  Drawer,
  IconButton,
  InputBase,
  Paper,
  Popper,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { formatPrice } from "@/shared/lib";
import type { PriceRange } from "@/shared/types";

interface PriceRangeFilterProps {
  value?: PriceRange;
  availableRange?: PriceRange;
  onApply: (value?: PriceRange) => void;
}

const normalizeInputValue = (value: string) => value.replace(/\D/g, "");

const parseInputValue = (value: string): number | undefined => {
  const normalized = normalizeInputValue(value);

  if (!normalized) {
    return undefined;
  }

  return Number(normalized);
};

const formatInputValue = (value?: number): string => {
  if (value === undefined) {
    return "";
  }

  return formatPrice(value);
};

const formatDesktopRangeLabel = (value?: PriceRange): string => {
  if (!value) {
    return "Цена, ₽";
  }

  const { minPrice, maxPrice } = value;

  if (minPrice !== undefined && maxPrice !== undefined) {
    return `Цена: от ${formatPrice(minPrice)} до ${formatPrice(maxPrice)}`;
  }

  if (minPrice !== undefined) {
    return `Цена: от ${formatPrice(minPrice)}`;
  }

  if (maxPrice !== undefined) {
    return `Цена: до ${formatPrice(maxPrice)}`;
  }

  return "Цена, ₽";
};

interface PriceInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  compact?: boolean;
}

const PriceInput = ({
  label,
  value,
  onChange,
  onSubmit,
  compact = false,
}: PriceInputProps) => {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: compact ? 0.5 : 0.75, pl: 0.25 }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          px: compact ? 1.5 : 2,
          py: compact ? 0.875 : 1.5,
          height: compact ? 36 : "auto",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          borderRadius: 2.5,
          bgcolor: "#eef1f5",
          transition:
            "box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease",
          border: "1px solid",
          borderColor: "#eef1f5",
          "&:focus-within": {
            bgcolor: "background.paper",
            borderColor: "rgba(239, 66, 132, 0.28)",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
          },
        }}
      >
        <InputBase
          value={value}
          onChange={(event) => onChange(normalizeInputValue(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder="0"
          inputProps={{
            inputMode: "numeric",
            "aria-label": label,
          }}
          sx={{
            width: "100%",
            height: "100%",
            fontSize: compact ? 14 : 16,
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        />
      </Box>
    </Box>
  );
};

export const PriceRangeFilter = ({
  value,
  availableRange,
  onApply,
}: PriceRangeFilterProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [isTriggerHovered, setIsTriggerHovered] = useState(false);
  const [isPopoverHovered, setIsPopoverHovered] = useState(false);
  const [isTriggerFocused, setIsTriggerFocused] = useState(false);
  const [isPopoverFocused, setIsPopoverFocused] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const triggerWrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);

  const hasActiveValue = useMemo(
    () => value?.minPrice !== undefined || value?.maxPrice !== undefined,
    [value?.maxPrice, value?.minPrice],
  );

  const desktopIsOpen =
    Boolean(triggerWrapperRef.current) &&
    (isTriggerHovered ||
      isPopoverHovered ||
      isTriggerFocused ||
      isPopoverFocused);

  const isOpen = isMobile ? isMobileOpen : desktopIsOpen;

  const triggerLabel = useMemo(() => {
    if (isMobile) {
      return "Цена";
    }

    return hasActiveValue ? formatDesktopRangeLabel(value) : "Цена, ₽";
  }, [hasActiveValue, isMobile, value]);

  const isMovingToElement = (
    relatedTarget: EventTarget | null,
    element: HTMLElement | null,
  ) =>
    relatedTarget instanceof Node && Boolean(element?.contains(relatedTarget));

  const syncDraftValues = useCallback(() => {
    setMinPriceInput(
      formatInputValue(availableRange?.minPrice ?? value?.minPrice),
    );
    setMaxPriceInput(
      formatInputValue(availableRange?.maxPrice ?? value?.maxPrice),
    );
  }, [
    availableRange?.maxPrice,
    availableRange?.minPrice,
    value?.maxPrice,
    value?.minPrice,
  ]);

  useEffect(() => {
    if (!isOpen) {
      syncDraftValues();
    }
  }, [isOpen, syncDraftValues]);

  const closeDesktopPopover = () => {
    setIsTriggerHovered(false);
    setIsPopoverHovered(false);
    setIsTriggerFocused(false);
    setIsPopoverFocused(false);
  };

  const handleMobileClose = () => {
    setIsMobileOpen(false);
    syncDraftValues();
  };

  const handleTriggerMouseEnter = () => {
    if (isMobile) {
      return;
    }

    syncDraftValues();
    setIsTriggerHovered(true);
  };

  const handleTriggerMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile) {
      return;
    }

    setIsTriggerHovered(false);

    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      setIsPopoverHovered(true);
      return;
    }

    syncDraftValues();
  };

  const handleTriggerFocus = (event: React.FocusEvent<HTMLElement>) => {
    if (isMobile || !event.currentTarget.matches(":focus-visible")) {
      return;
    }

    setIsTriggerFocused(true);
  };

  const handleTriggerBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (isMobile) {
      return;
    }

    setIsTriggerFocused(false);

    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      setIsPopoverFocused(true);
      return;
    }

    syncDraftValues();
  };

  const handlePopoverMouseEnter = () => {
    setIsPopoverHovered(true);
  };

  const handlePopoverMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    setIsPopoverHovered(false);

    if (isMovingToElement(event.relatedTarget, triggerWrapperRef.current)) {
      setIsTriggerHovered(true);
      return;
    }

    syncDraftValues();
  };

  const handlePopoverFocus = () => {
    setIsPopoverFocused(true);
  };

  const handlePopoverBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      return;
    }

    setIsPopoverFocused(false);

    if (isMovingToElement(event.relatedTarget, triggerRef.current)) {
      setIsTriggerFocused(true);
      return;
    }

    syncDraftValues();
  };

  const handleReset = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    onApply(undefined);

    if (isMobile) {
      return;
    }

    closeDesktopPopover();
  };

  const handleApply = () => {
    let minPrice = parseInputValue(minPriceInput);
    let maxPrice = parseInputValue(maxPriceInput);

    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }

    if (minPrice === undefined && maxPrice === undefined) {
      onApply(undefined);

      if (isMobile) {
        setIsMobileOpen(false);
      } else {
        closeDesktopPopover();
      }

      return;
    }

    onApply({
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    });

    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      closeDesktopPopover();
    }
  };

  const handleClearIndicatorClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setMinPriceInput("");
    setMaxPriceInput("");
    onApply(undefined);

    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      closeDesktopPopover();
    }
  };

  const renderDesktopPanel = () => (
    <Popper
      open={isOpen}
      anchorEl={triggerWrapperRef.current}
      placement="bottom-start"
      sx={{ zIndex: theme.zIndex.modal }}
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
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handlePopoverMouseLeave}
        onFocus={handlePopoverFocus}
        onBlur={handlePopoverBlur}
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
                onChange={setMinPriceInput}
                onSubmit={handleApply}
              />
              <PriceInput
                label="До"
                value={maxPriceInput}
                onChange={setMaxPriceInput}
                onSubmit={handleApply}
              />
            </Stack>

            <Stack direction="row" spacing={1.5}>
              <Button
                fullWidth
                onClick={handleReset}
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
                onClick={handleApply}
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

  const renderMobilePanel = () => (
    <Drawer
      anchor="bottom"
      open={isOpen}
      onClose={handleMobileClose}
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
              onClick={handleReset}
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

            <IconButton onClick={handleMobileClose} aria-label="Закрыть">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.25}>
          <PriceInput
            label="От"
            value={minPriceInput}
            onChange={setMinPriceInput}
            onSubmit={handleApply}
            compact
          />
          <PriceInput
            label="До"
            value={maxPriceInput}
            onChange={setMaxPriceInput}
            onSubmit={handleApply}
            compact
          />
        </Stack>

        <Button
          fullWidth
          onClick={handleApply}
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

  return (
    <>
      <Box
        ref={triggerWrapperRef}
        onMouseEnter={handleTriggerMouseEnter}
        onMouseLeave={handleTriggerMouseLeave}
        sx={{ display: "inline-flex" }}
      >
        <Button
          ref={triggerRef}
          onClick={() => {
            if (isMobile) {
              syncDraftValues();
              setIsMobileOpen(true);
            }
          }}
          onFocus={handleTriggerFocus}
          onBlur={handleTriggerBlur}
          endIcon={
            hasActiveValue ? (
              <Box
                onClick={handleClearIndicatorClick}
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
          {triggerLabel}
        </Button>
      </Box>

      {isMobile ? renderMobilePanel() : renderDesktopPanel()}
    </>
  );
};
