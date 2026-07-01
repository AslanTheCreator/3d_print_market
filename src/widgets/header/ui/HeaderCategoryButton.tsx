"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { IconButton, useTheme } from "@mui/material";
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

interface HeaderCategoryButtonProps {
  isMobile: boolean;
}

export const HeaderCategoryButton = ({
  isMobile,
}: HeaderCategoryButtonProps) => {
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
            },
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
      {shouldMountDrawer && (
        <LazyCategoriesDrawer
          open={isOpen}
          onClose={handleClose}
          isMobile={isMobile}
        />
      )}
    </>
  );
};
