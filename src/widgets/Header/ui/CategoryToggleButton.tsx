"use client";

import React, { useState } from "react";
import { IconButton, Drawer, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu"; // или используйте свою иконку
import CloseIcon from "@mui/icons-material/Close";
import { CategoriesMenu } from "./CategoriesMenu"; // новый компонент, который мы создадим
import { MobileCategoriesDrawer } from "./MobileCategoriesDrawer ";

export const CategoryToggleButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <IconButton
        onClick={toggleDrawer}
        aria-label="Открыть категории"
        sx={{
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          borderRadius: 1,
          width: 33,
          height: 33,
          "&:hover": {
            backgroundColor: "primary.dark",
          },
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>
      <MobileCategoriesDrawer open={isOpen} onClose={toggleDrawer} />

      {/* <Drawer
        anchor="left"
        open={isOpen}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
            width: "300px",
            maxWidth: "80%",
            pb: 2,
          },
        }}
      >
        <CategoriesMenu onClose={toggleDrawer} />
      </Drawer> */}
    </>
  );
};
