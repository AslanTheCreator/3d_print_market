"use client";

import { useUser } from "@/entities/user/hooks/useUser";
import React from "react";
import { Box, Typography } from "@mui/material";
import ProfileWidget from "@/widgets/profile/ui/Profile";

export default function ProfilePage() {
  const { data: userData, isLoading, isError } = useUser({});

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
