"use client";

import type React from "react";
import { useTheme } from "@mui/material";
import type { PriceRange } from "@/entities/product";
import { PriceRangeDesktopPanel } from "./price-range-filter/PriceRangeDesktopPanel";
import { PriceRangeMobileDrawer } from "./price-range-filter/PriceRangeMobileDrawer";
import { PriceRangeTrigger } from "./price-range-filter/PriceRangeTrigger";
import { usePriceRangeFilter } from "./price-range-filter/usePriceRangeFilter";

interface PriceRangeFilterProps {
  value?: PriceRange;
  availableRange?: PriceRange;
  onApply: (value?: PriceRange) => void;
}

export const PriceRangeFilter = ({
  value,
  availableRange,
  onApply,
}: PriceRangeFilterProps): React.ReactElement => {
  const theme = useTheme();
  const filter = usePriceRangeFilter({
    value,
    availableRange,
    compactBreakpoint: theme.breakpoints.values.sm,
    onApply,
  });

  return (
    <>
      <PriceRangeTrigger
        wrapperRef={filter.triggerWrapperRef}
        triggerRef={filter.triggerRef}
        label={filter.triggerLabel}
        hasActiveValue={filter.hasActiveValue}
        isOpen={filter.isOpen}
        surfaceId={filter.surfaceId}
        onClick={filter.handleTriggerClick}
        onClearIndicatorClick={filter.handleClearIndicatorClick}
      />

      {filter.surface === "mobile" ? (
        <PriceRangeMobileDrawer
          open={filter.isOpen}
          surfaceId={filter.surfaceId}
          minPricePlaceholder={filter.minPricePlaceholder}
          maxPricePlaceholder={filter.maxPricePlaceholder}
          minPriceInput={filter.minPriceInput}
          minPriceError={filter.minPriceError}
          maxPriceError={filter.maxPriceError}
          maxPriceInput={filter.maxPriceInput}
          onMinPriceChange={filter.setMinPriceInput}
          onMaxPriceChange={filter.setMaxPriceInput}
          onApply={filter.handleApply}
          onReset={filter.handleReset}
          onClose={filter.handleClose}
        />
      ) : null}

      {filter.surface === "desktop" ? (
        <PriceRangeDesktopPanel
          open={filter.isOpen}
          surfaceId={filter.surfaceId}
          minPricePlaceholder={filter.minPricePlaceholder}
          maxPricePlaceholder={filter.maxPricePlaceholder}
          anchorEl={filter.triggerWrapperRef.current}
          minPriceInput={filter.minPriceInput}
          minPriceError={filter.minPriceError}
          maxPriceError={filter.maxPriceError}
          maxPriceInput={filter.maxPriceInput}
          onMinPriceChange={filter.setMinPriceInput}
          onMaxPriceChange={filter.setMaxPriceInput}
          onApply={filter.handleApply}
          onReset={filter.handleReset}
          onClose={filter.handleClose}
        />
      ) : null}
    </>
  );
};
