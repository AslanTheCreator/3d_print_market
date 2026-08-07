"use client";

import React from "react";
import { Box, Drawer } from "@mui/material";
import { LAYOUT } from "@/shared/config";
import { CategoriesMenu } from "./CategoriesMenu";

interface CategoriesDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CategoriesDrawer: React.FC<CategoriesDrawerProps> = ({
  open,
  onClose,
}) => {
  const topOffset = LAYOUT.HEADER_HEIGHT_PX;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant="temporary"
      sx={{
        top: { xs: 0, md: topOffset },
        "& .MuiBackdrop-root": {
          backgroundColor: {
            xs: "rgba(0, 0, 0, 0.5)",
            md: "transparent",
          },
        },
        "& .MuiDrawer-paper": {
          top: { xs: 0, md: topOffset },
          width: { xs: "100%", md: "340px" },
          maxWidth: { xs: "100vw", md: "340px" },
          height: {
            xs: "100%",
            md: `calc(100vh - ${LAYOUT.HEADER_HEIGHT_PX})`,
          },
          boxSizing: "border-box",
          backgroundColor: "background.paper",
          backgroundImage:
            "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,1) 180px)",
          borderTopRightRadius: { xs: 0, md: 16 },
          borderBottomRightRadius: { xs: 0, md: 16 },
          boxShadow: { xs: 16, md: 12 },
          overflowY: "auto",
        },
      }}
      ModalProps={{
        keepMounted: true,
      }}
    >
      <Box
        data-testid="categories-drawer-content"
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <CategoriesMenu onClose={onClose} enabled={open} showCloseButton />
      </Box>
    </Drawer>
  );
};
