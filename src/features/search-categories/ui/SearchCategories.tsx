"use client";

import React from "react";
import MenuIcon from "@mui/icons-material/Menu";
import { Stack, MenuItem, Menu, Button } from "@mui/material";

export const SearchCategories = () => {
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
        id="basic-button"
        aria-controls={open ? "basic-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : "false"}
        variant={"contained"}
        sx={{ minWidth: "36px", minHeight: "40px" }}
        onClick={handleClick}
      >
        <MenuIcon color={"secondary"} />
      </Button>
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
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
