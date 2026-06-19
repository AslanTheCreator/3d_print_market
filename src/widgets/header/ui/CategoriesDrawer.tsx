"use client";

import React from "react";
import {
  Drawer,
  Box,
  useTheme,
  ClickAwayListener,
} from "@mui/material";
import { CategoriesMenu } from "./CategoriesMenu";
import { LAYOUT } from "@/shared/config";

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
            backgroundImage:
              "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 180px)",
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
          }}
        >
          <CategoriesMenu
            onClose={onClose}
            enabled={open}
            showCloseButton
          />
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
          width: "340px",
          height: `calc(100vh - ${LAYOUT.HEADER_HEIGHT_PX})`,
          backgroundColor: theme.palette.background.paper,
          backgroundImage:
            "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 180px)",
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          boxShadow: theme.shadows[12],
          zIndex: theme.zIndex.drawer,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: theme.transitions.create(["transform"], {
            duration: theme.transitions.duration.enteringScreen,
            easing: theme.transitions.easing.easeOut,
          }),
          overflowY: "auto",
        }}
      >
        <CategoriesMenu onClose={onClose} enabled={open} />
      </Box>
    </ClickAwayListener>
  );
};
