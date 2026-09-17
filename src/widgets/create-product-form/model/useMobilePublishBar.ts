"use client";

import { useEffect, useRef } from "react";

export const useMobilePublishBar = (enabled: boolean) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const form = bar?.closest("form");
    if (!enabled || !bar || !form) return;

    const viewport = window.visualViewport;
    const mobile = window.matchMedia("(max-width: 899.95px)");
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        const isEditing = active instanceof HTMLElement && form.contains(active) &&
          active.matches("input, textarea, [contenteditable=true]");
        const keyboardOffset = mobile.matches && isEditing && viewport?.scale === 1
          ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
        form.style.setProperty("--product-keyboard-offset", `${keyboardOffset}px`);
        const barHeight = bar.getBoundingClientRect().height;
        form.style.setProperty("--product-publish-height", `${barHeight}px`);
        document.documentElement.style.setProperty("--shell-fixed-action-offset", `${mobile.matches ? barHeight + keyboardOffset : 0}px`);
        if (mobile.matches && isEditing) {
          const bounds = active.getBoundingClientRect();
          if (bounds.bottom > bar.getBoundingClientRect().top && bounds.height < (viewport?.height ?? window.innerHeight) / 2) {
            active.scrollIntoView({ block: "center", behavior: "instant" });
          }
        }
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    mobile.addEventListener("change", measure);
    form.addEventListener("focusin", measure);
    form.addEventListener("focusout", measure);
    measure();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      mobile.removeEventListener("change", measure);
      form.removeEventListener("focusin", measure);
      form.removeEventListener("focusout", measure);
      form.style.removeProperty("--product-keyboard-offset");
      form.style.removeProperty("--product-publish-height");
      document.documentElement.style.removeProperty("--shell-fixed-action-offset");
    };
  }, [enabled]);

  return barRef;
};
