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
        onClick={filter.handleTriggerClick}
        onClearIndicatorClick={filter.handleClearIndicatorClick}
        onMouseEnter={filter.handleTriggerMouseEnter}
        onMouseLeave={filter.handleTriggerMouseLeave}
        onFocus={filter.handleTriggerFocus}
        onBlur={filter.handleTriggerBlur}
      />

      {filter.surface === "mobile" ? (
        <PriceRangeMobileDrawer
          open={filter.isOpen}
          minPriceInput={filter.minPriceInput}
          maxPriceInput={filter.maxPriceInput}
          onMinPriceChange={filter.setMinPriceInput}
          onMaxPriceChange={filter.setMaxPriceInput}
          onApply={filter.handleApply}
          onReset={filter.handleReset}
          onClose={filter.handleMobileClose}
        />
      ) : null}

      {filter.surface === "desktop" ? (
        <PriceRangeDesktopPanel
          open={filter.isOpen}
          anchorEl={filter.triggerWrapperRef.current}
          popoverPaperRef={filter.popoverPaperRef}
          minPriceInput={filter.minPriceInput}
          maxPriceInput={filter.maxPriceInput}
          onMinPriceChange={filter.setMinPriceInput}
          onMaxPriceChange={filter.setMaxPriceInput}
          onApply={filter.handleApply}
          onReset={filter.handleReset}
          onMouseEnter={filter.handlePopoverMouseEnter}
          onMouseLeave={filter.handlePopoverMouseLeave}
          onFocus={filter.handlePopoverFocus}
          onBlur={filter.handlePopoverBlur}
        />
      ) : null}
    </>
  );
};
