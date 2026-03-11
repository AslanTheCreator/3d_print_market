"use client";

import { useMediaQuery, useTheme } from "@mui/material";

/**
 * Хук для определения мобильного устройства
 * Единая точка определения breakpoint для всего приложения
 *
 * @module shared/hooks/useIsMobile
 */
export const useIsMobile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return isMobile;
};
