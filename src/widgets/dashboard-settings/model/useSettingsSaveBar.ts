"use client";

import { useEffect, useRef } from "react";

export const useSettingsSaveBar = (enabled: boolean) => {
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
        const editing = active instanceof HTMLElement && form.contains(active) && active.matches("input, textarea");
        const keyboard = mobile.matches && editing && viewport?.scale === 1
          ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
        form.style.setProperty("--settings-keyboard-offset", `${keyboard}px`);
        const height = mobile.matches ? bar.getBoundingClientRect().height : 0;
        form.style.setProperty("--settings-action-height", `${height}px`);
        const bottom = Number.parseFloat(getComputedStyle(bar).bottom) || 0;
        document.documentElement.style.setProperty("--shell-fixed-action-offset", `${mobile.matches ? height + bottom : 0}px`);
        if (mobile.matches && editing && active.getBoundingClientRect().bottom > bar.getBoundingClientRect().top) {
          active.scrollIntoView({ block: "center", behavior: "instant" });
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
      form.style.removeProperty("--settings-keyboard-offset");
      form.style.removeProperty("--settings-action-height");
      document.documentElement.style.removeProperty("--shell-fixed-action-offset");
    };
  }, [enabled]);
  return barRef;
};
