"use client";

import React from "react";
import MenuIcon from "@mui/icons-material/Menu";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";

const CategoriesMenu = () => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <div>
      <Button
        variant={"contained"}
        sx={{ minWidth: "36px", minHeight: "40px" }}
        onClick={handleClick}
      >
        <MenuIcon color={"secondary"} />
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={handleClose} sx={{ width: "290px" }}>
          <Stack
            width={"100%"}
            direction={"row"}
            justifyContent={"space-between"}
          >
            Action figures
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleClose}>Чиби</MenuItem>
        <MenuItem onClick={handleClose}>Statues</MenuItem>
      </Menu>
    </div>
  );
};

export default CategoriesMenu;
