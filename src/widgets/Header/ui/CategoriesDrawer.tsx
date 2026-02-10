"use client";

import React from "react";
import {
  Drawer,
  Box,
  IconButton,
  useTheme,
  ClickAwayListener,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CategoriesMenu } from "./CategoriesMenu";
import { LAYOUT } from "@/shared/config/layout";

interface CategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

export const CategoriesDrawer: React.FC<CategoriesDrawerProps> = ({
  open,
  onClose,
  isMobile,
}) => {
  const theme = useTheme();

  // Для мобильных — стандартный MUI Drawer (Escape обрабатывается из коробки)
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        variant="temporary"
        sx={{
          "& .MuiDrawer-paper": {
            width: "100%",
            maxWidth: "100vw",
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        ModalProps={{
          keepMounted: true,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Закрыть меню категорий"
              sx={{
                backgroundColor: theme.palette.background.default,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <CategoriesMenu onClose={onClose} />
        </Box>
      </Drawer>
    );
  }

  // Для десктопа — кастомное позиционирование
  if (!open) return null;

  const topOffset = `${LAYOUT.HEADER_HEIGHT + 3}px`;

  return (
    <ClickAwayListener onClickAway={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: topOffset,
          left: 0,
          width: "320px",
          height: `calc(100vh - ${LAYOUT.HEADER_HEIGHT_PX})`,
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[8],
          zIndex: theme.zIndex.drawer,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: theme.transitions.create(["transform"], {
            duration: theme.transitions.duration.enteringScreen,
            easing: theme.transitions.easing.easeOut,
          }),
          overflowY: "auto",
        }}
      >
        <CategoriesMenu onClose={onClose} />
      </Box>
    </ClickAwayListener>
  );
};
