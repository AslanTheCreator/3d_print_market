"use client";

import { useState, useEffect, useRef } from "react";

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
  const lastRunAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      lastScrollYRef.current = window.scrollY;
      return;
    }

    const updateVisibility = () => {
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
      lastRunAtRef.current = Date.now();
    };

    const handleScroll = () => {
      const elapsed = Date.now() - lastRunAtRef.current;
      const remainingDelay = throttleDelay - elapsed;

      if (remainingDelay <= 0) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        updateVisibility();
        return;
      }

      if (timeoutRef.current) return;

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        updateVisibility();
      }, remainingDelay);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      window.removeEventListener("scroll", handleScroll);
    };
  }, [enabled, scrollThreshold, throttleDelay]);

  return isVisible;
};
