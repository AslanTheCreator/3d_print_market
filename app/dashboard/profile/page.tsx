"use client";

import { useUser } from "@/entities/user/hooks/useUser";
import { useAuth } from "@/features/auth/hooks/useAuth";
import React from "react";
import { Box, Typography } from "@mui/material";
import ProfileWidget from "@/widgets/profile/ui/Profile";

export default function ProfilePage() {
  const { token, isLoading: authLoading } = useAuth();
  const { data: userData, isLoading, isError } = useUser({ token });

  if (isError || !userData) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="80vh"
      >
        <Typography color="error">
          Не удалось загрузить данные профиля. Пожалуйста, попробуйте позже.
        </Typography>
      </Box>
    );
  }

  return <ProfileWidget userData={userData} />;
}
