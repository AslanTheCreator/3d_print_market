"use client";

import React, { useEffect } from "react";
import {
  Drawer,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
  ClickAwayListener,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CategoriesMenu } from "./CategoriesMenu";

interface CategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CategoriesDrawer: React.FC<CategoriesDrawerProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Закрытие при нажатии Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  // Для мобильных устройств используем стандартный Drawer
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
          {/* Close button for mobile */}
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

  // Для десктопа используем кастомное позиционирование
  if (!open) return null;

  return (
    <ClickAwayListener onClickAway={onClose}>
      <Box
        sx={{
          position: "fixed",
          top: "122px", // Высота хедера
          left: 0,
          width: "320px",
          height: "calc(100vh - 119px)",
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[8],
          zIndex: theme.zIndex.drawer,
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: theme.transitions.create("transform", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
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
          <CategoriesMenu onClose={onClose} />
        </Box>
      </Box>
    </ClickAwayListener>
  );
};
