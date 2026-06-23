import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PriceRange } from "@/shared/types";
import {
  formatDesktopRangeLabel,
  formatInputValue,
  parseInputValue,
} from "./model";

interface UsePriceRangeFilterOptions {
  value?: PriceRange;
  availableRange?: PriceRange;
  isMobile: boolean;
  onApply: (value?: PriceRange) => void;
}

export const usePriceRangeFilter = ({
  value,
  availableRange,
  isMobile,
  onApply,
}: UsePriceRangeFilterOptions) => {
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

  const handleTriggerClick = () => {
    if (isMobile) {
      syncDraftValues();
      setIsMobileOpen(true);
    }
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
    triggerLabel,
    triggerRef,
    triggerWrapperRef,
  };
};
