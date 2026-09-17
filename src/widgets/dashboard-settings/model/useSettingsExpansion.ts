"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const useSettingsExpansion = (initial: Set<string>) => {
  const initialKeys = useRef(initial);
  const [expandedItems, setExpandedItems] = useState(new Set<string>());
  useEffect(() => {
    if (window.matchMedia("(min-width: 900px)").matches) {
      setExpandedItems(initialKeys.current);
    }
  }, []);
  const toggleExpanded = useCallback((key: string) => {
    const compact = window.matchMedia("(max-width: 899.95px)").matches;
    setExpandedItems((previous) => {
      const next = new Set(compact ? [] : previous);
      if (previous.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  return { expandedItems, toggleExpanded };
};
