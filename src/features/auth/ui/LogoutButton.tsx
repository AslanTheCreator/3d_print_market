"use client";

import React from "react";
import { ListItem, ListItemIcon, ListItemText } from "@mui/material";
import { ExitToApp as ExitToAppIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";

export const LogoutButton: React.FC = () => {
  const router = useRouter();

  const handleLogout = () => {
    //localStorage.removeItem("token");
    router.push("/auth/login");
  };

  return (
    <ListItem onClick={handleLogout}>
      <ListItemIcon>
        <ExitToAppIcon color="error" />
      </ListItemIcon>
      <ListItemText
        primary="Выход"
        primaryTypographyProps={{ color: "error" }}
      />
    </ListItem>
  );
};
