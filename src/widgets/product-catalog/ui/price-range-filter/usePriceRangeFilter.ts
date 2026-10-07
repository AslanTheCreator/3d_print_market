import type React from "react";
import { useId, useRef, useState } from "react";
import type { PriceRange } from "@/entities/product";
import { formatDesktopRangeLabel, formatInputValue, parseInputValue } from "./model";

interface UsePriceRangeFilterOptions {
  value?: PriceRange;
  availableRange?: PriceRange;
  compactBreakpoint: number;
  onApply: (value?: PriceRange) => void;
}

export const usePriceRangeFilter = ({
  value, availableRange, compactBreakpoint, onApply,
}: UsePriceRangeFilterOptions) => {
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [surface, setSurface] = useState<"mobile" | "desktop" | null>(null);
  const surfaceId = useId();
  const triggerWrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hasActiveValue = value?.minPrice !== undefined || value?.maxPrice !== undefined;
  const minPriceError = minPriceInput.trim() !== "" && parseInputValue(minPriceInput) === undefined
    ? "Введите конечную неотрицательную цену" : undefined;
  const maxPriceError = maxPriceInput.trim() !== "" && parseInputValue(maxPriceInput) === undefined
    ? "Введите конечную неотрицательную цену" : undefined;

  const handleClose = () => setSurface(null);

  const handleTriggerClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMinPriceInput(formatInputValue(value?.minPrice));
    setMaxPriceInput(formatInputValue(value?.maxPrice));
    setSurface(window.matchMedia(`(max-width: ${compactBreakpoint - 0.05}px)`).matches
      ? "mobile" : "desktop");
  };

  const handleReset = () => {
    setMinPriceInput("");
    setMaxPriceInput("");
    onApply(undefined);
    handleClose();
  };

  const handleApply = () => {
    if (minPriceError || maxPriceError) return;
    let minPrice = parseInputValue(minPriceInput);
    let maxPrice = parseInputValue(maxPriceInput);
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }
    onApply(minPrice === undefined && maxPrice === undefined ? undefined : {
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    });
    handleClose();
  };

  const handleClearIndicatorClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleReset();
    triggerRef.current?.focus();
  };

  return {
    handleApply, handleClearIndicatorClick, handleClose, handleReset, handleTriggerClick,
    hasActiveValue, isOpen: surface !== null, surface, surfaceId,
    minPriceInput, maxPriceInput, minPriceError, maxPriceError,
    minPricePlaceholder: formatInputValue(availableRange?.minPrice) || "Не задано",
    maxPricePlaceholder: formatInputValue(availableRange?.maxPrice) || "Не задано",
    setMinPriceInput, setMaxPriceInput, triggerRef, triggerWrapperRef,
    triggerLabel: hasActiveValue ? formatDesktopRangeLabel(value) : "Цена, ₽",
  };
};
