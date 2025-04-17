"use client";

import React, { useState } from "react";
import { Box, IconButton, Drawer } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu"; // или используйте свою иконку
import CloseIcon from "@mui/icons-material/Close";
import { CategoriesMenu } from "./CategoriesMenu"; // новый компонент, который мы создадим

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
          color: "white",
          borderRadius: 1,
          width: 40,
          height: 40,
          "&:hover": {
            backgroundColor: "primary.dark",
          },
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      <Drawer
        anchor="left"
        open={isOpen}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
            width: "300px",
            maxWidth: "80%",
            pt: 2,
            pb: 2,
          },
        }}
      >
        <CategoriesMenu onClose={toggleDrawer} />
      </Drawer>
    </>
  );
};
