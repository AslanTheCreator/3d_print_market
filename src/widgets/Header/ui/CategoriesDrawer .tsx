"use client";

import React from "react";
import {
  Drawer,
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
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

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant={isMobile ? "temporary" : "persistent"}
      sx={{
        "& .MuiDrawer-paper": {
          width: {
            xs: "100%", // На мобильных устройствах занимает всю ширину
            sm: "320px", // На планшетах фиксированная ширина
            md: "350px", // На десктопе чуть шире
          },
          maxWidth: "100vw",
          boxSizing: "border-box",
          backgroundColor: theme.palette.background.paper,
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
      ModalProps={{
        keepMounted: true, // Улучшает производительность на мобильных устройствах
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
        {isMobile && (
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
                backgroundColor: (theme) => theme.palette.background.default,
                "&:hover": {
                  backgroundColor: (theme) => theme.palette.action.hover,
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        )}

        {/* Categories menu */}
        <CategoriesMenu onClose={onClose} />
      </Box>
    </Drawer>
  );
};
