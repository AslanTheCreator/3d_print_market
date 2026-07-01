"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { useIntersectionObserver } from "usehooks-ts";

interface DeferredProductSectionProps {
  children: ReactNode;
  rootMargin?: string;
}

export function DeferredProductSection({
  children,
  rootMargin = "700px",
}: DeferredProductSectionProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const { ref, entry } = useIntersectionObserver({
    threshold: 0,
    rootMargin,
  });

  useEffect(() => {
    if (entry?.isIntersecting) {
      setShouldRender(true);
    }
  }, [entry?.isIntersecting]);

  if (shouldRender) {
    return <>{children}</>;
  }

  return <Box ref={ref} aria-hidden sx={{ minHeight: 1 }} />;
}
