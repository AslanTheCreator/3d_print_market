"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Box, IconButton, useTheme } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const LazyCategoriesDrawer = dynamic(
  () =>
    import("./CategoriesDrawer").then((module) => module.CategoriesDrawer),
  {
    ssr: false,
    loading: () => null,
  },
);

export const HeaderCategoryButton = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [shouldMountDrawer, setShouldMountDrawer] = useState(false);

  const handleOpen = () => {
    setShouldMountDrawer(true);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <IconButton
        onClick={isOpen ? handleClose : handleOpen}
        aria-label={isOpen ? "Закрыть категории" : "Открыть категории"}
        aria-expanded={isOpen}
        sx={{
          width: { xs: 44, md: 58 },
          height: { xs: 44, md: 58 },
          p: 0,
          color: theme.palette.primary.contrastText,
          borderRadius: 2,
          transition: theme.transitions.create(
            ["transform"],
            {
              duration: theme.transitions.duration.shorter,
            },
          ),
          "&:hover": {
            backgroundColor: "transparent",
            transform: "scale(1.02)",
            "& .HeaderCategoryButton-visual": {
              backgroundColor: theme.palette.primary.dark,
            },
          },
          "&:active": {
            transform: "scale(0.98)",
          },
        }}
      >
        <Box
          component="span"
          className="HeaderCategoryButton-visual"
          data-testid="header-category-button-visual"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: 33, md: 58 },
            height: { xs: 33, md: 58 },
            borderRadius: 2,
            backgroundColor: theme.palette.primary.main,
            transition: theme.transitions.create("background-color", {
              duration: theme.transitions.duration.shorter,
            }),
          }}
        >
          {isOpen ? <CloseIcon /> : <MenuIcon />}
        </Box>
      </IconButton>
      {shouldMountDrawer && (
        <LazyCategoriesDrawer open={isOpen} onClose={handleClose} />
      )}
    </>
  );
};
