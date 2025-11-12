"use client";

import React, { useState } from "react";
import {
  ListItemButton,
  ListItemIcon,
  ListItemText,
  alpha,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { Logout as LogoutIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { authApi } from "../api/authApi";

export const LogoutButton: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false);
    }
  };

  return (
    <ListItemButton
      onClick={handleLogout}
      disabled={isLoading}
      sx={{
        borderRadius: 1.5,
        py: 1.25,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          backgroundColor: alpha(theme.palette.error.main, 0.08),
          transform: "translateX(4px)",
          "& .MuiListItemIcon-root": {
            color: theme.palette.error.main,
          },
          "& .MuiListItemText-primary": {
            color: theme.palette.error.main,
          },
        },
        "&.Mui-disabled": {
          opacity: 0.6,
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: 44, transition: "color 0.2s" }}>
        {isLoading ? (
          <CircularProgress size={24} color="error" />
        ) : (
          <LogoutIcon sx={{ color: "text.secondary" }} />
        )}
      </ListItemIcon>
      <ListItemText
        primary={isLoading ? "Выход..." : "Выход"}
        primaryTypographyProps={{
          fontWeight: 500,
          fontSize: "0.9375rem",
          color: "text.secondary",
        }}
      />
    </ListItemButton>
  );
};
