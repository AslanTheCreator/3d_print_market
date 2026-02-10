"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { throttle } from "lodash";

interface UseHideOnScrollOptions {
  /** Включить ли скрытие (обычно только на мобилке) */
  enabled: boolean;
  /** Минимальный скролл до начала скрытия (px) */
  scrollThreshold?: number;
  /** Задержка throttle (ms) */
  throttleDelay?: number;
}

/**
 * Хук для скрытия/показа элемента при скролле
 * Скрывает при скролле вниз, показывает при скролле вверх
 *
 * @module shared/hooks/useHideOnScroll
 */
export const useHideOnScroll = ({
  enabled,
  scrollThreshold = 50,
  throttleDelay = 50,
}: UseHideOnScrollOptions): boolean => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  const handleScroll = useMemo(
    () =>
      throttle(() => {
        const currentScrollY = window.scrollY;

        if (
          currentScrollY > lastScrollYRef.current &&
          currentScrollY > scrollThreshold
        ) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
      }, throttleDelay),
    [scrollThreshold, throttleDelay],
  );

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    window.addEventListener("scroll", handleScroll);

    return () => {
      handleScroll.cancel();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, handleScroll]);

  return isVisible;
};
