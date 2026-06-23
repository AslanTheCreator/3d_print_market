"use client";

import type React from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import type { PriceRange } from "@/shared/types";
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const filter = usePriceRangeFilter({
    value,
    availableRange,
    isMobile,
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

      {isMobile ? (
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
      ) : (
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
      )}
    </>
  );
};
