"use client";

import React, { useState } from "react";
import { IconButton, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu"; // или используйте свою иконку
import CloseIcon from "@mui/icons-material/Close";
import { CategoriesDrawer } from "./CategoriesDrawer ";

export const HeaderCategoryButton = () => {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <IconButton
        onClick={toggleDrawer}
        aria-label="Открыть категории"
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          borderRadius: 2,
          width: isMobile ? 33 : 58,
          height: isMobile ? 33 : 58,
          transition: theme.transitions.create(
            ["background-color", "transform"],
            {
              duration: theme.transitions.duration.shorter,
            }
          ),
          "&:hover": {
            backgroundColor: theme.palette.primary.dark,
            transform: "scale(1.02)",
          },
          "&:active": {
            transform: "scale(0.98)",
          },
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>
      <CategoriesDrawer open={isOpen} onClose={toggleDrawer} />
    </>
  );
};
