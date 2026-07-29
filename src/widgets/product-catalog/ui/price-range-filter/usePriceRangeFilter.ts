import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PriceRange } from "@/entities/product";
import {
  formatDesktopRangeLabel,
  formatInputValue,
  parseInputValue,
} from "./model";

interface UsePriceRangeFilterOptions {
  value?: PriceRange;
  availableRange?: PriceRange;
  compactBreakpoint: number;
  onApply: (value?: PriceRange) => void;
}

type PriceRangeSurface = "mobile" | "desktop" | null;

export const usePriceRangeFilter = ({
  value,
  availableRange,
  compactBreakpoint,
  onApply,
}: UsePriceRangeFilterOptions) => {
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [surface, setSurface] = useState<PriceRangeSurface>(null);

  const triggerWrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverPaperRef = useRef<HTMLDivElement | null>(null);

  const hasActiveValue = useMemo(
    () => value?.minPrice !== undefined || value?.maxPrice !== undefined,
    [value?.maxPrice, value?.minPrice],
  );
  const isOpen = surface !== null;
  const triggerLabel = useMemo(
    () => (hasActiveValue ? formatDesktopRangeLabel(value) : "Цена, ₽"),
    [hasActiveValue, value],
  );

  const isCompactViewport = () =>
    window.matchMedia(
      `(max-width: ${compactBreakpoint - 0.05}px)`,
    ).matches;

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

  const closeSurface = () => {
    setSurface(null);
  };

  const closeDesktopPopover = () => {
    closeSurface();
  };

  const handleMobileClose = () => {
    closeSurface();
    syncDraftValues();
  };

  const handleTriggerMouseEnter = () => {
    if (surface !== null || isCompactViewport()) {
      return;
    }

    syncDraftValues();
    setSurface("desktop");
  };

  const handleTriggerMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    if (surface !== "desktop") {
      return;
    }

    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      return;
    }

    closeSurface();
    syncDraftValues();
  };

  const handleTriggerFocus = (event: React.FocusEvent<HTMLElement>) => {
    if (
      surface !== null ||
      isCompactViewport() ||
      !event.currentTarget.matches(":focus-visible")
    ) {
      return;
    }

    setSurface("desktop");
  };

  const handleTriggerBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (surface !== "desktop") {
      return;
    }

    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      return;
    }

    closeSurface();
    syncDraftValues();
  };

  const handlePopoverMouseEnter = () => {
    setSurface("desktop");
  };

  const handlePopoverMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    if (isMovingToElement(event.relatedTarget, triggerWrapperRef.current)) {
      return;
    }

    closeSurface();
    syncDraftValues();
  };

  const handlePopoverFocus = () => {
    setSurface("desktop");
  };

  const handlePopoverBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (isMovingToElement(event.relatedTarget, popoverPaperRef.current)) {
      return;
    }

    if (isMovingToElement(event.relatedTarget, triggerRef.current)) {
      return;
    }

    closeSurface();
    syncDraftValues();
  };

  const handleReset = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    onApply(undefined);

    if (surface === "desktop") {
      closeDesktopPopover();
    }
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
      closeDesktopPopover();
      return;
    }

    onApply({
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    });
    closeDesktopPopover();
  };

  const handleClearIndicatorClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setMinPriceInput("");
    setMaxPriceInput("");
    onApply(undefined);
    closeDesktopPopover();
  };

  const handleTriggerClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    syncDraftValues();
    setSurface(isCompactViewport() ? "mobile" : "desktop");
  };

  return {
    handleApply,
    handleClearIndicatorClick,
    handleMobileClose,
    handlePopoverBlur,
    handlePopoverFocus,
    handlePopoverMouseEnter,
    handlePopoverMouseLeave,
    handleReset,
    handleTriggerBlur,
    handleTriggerClick,
    handleTriggerFocus,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    hasActiveValue,
    isOpen,
    maxPriceInput,
    minPriceInput,
    popoverPaperRef,
    setMaxPriceInput,
    setMinPriceInput,
    surface,
    triggerLabel,
    triggerRef,
    triggerWrapperRef,
  };
};
