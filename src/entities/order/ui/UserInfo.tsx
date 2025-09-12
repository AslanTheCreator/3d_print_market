"use client";
import React from "react";
import { Stack, Avatar, Box, Typography, Chip } from "@mui/material";
import { Phone, Email, Store, AccountCircle } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";

type UserRole = "seller" | "customer";

interface UserInfoProps {
  userInfo: ListOrdersModel["userInfo"];
  userRole: UserRole;
  isCurrentUser?: boolean;
}

export const UserInfo = ({
  userInfo,
  userRole,
  isCurrentUser = false,
}: UserInfoProps) => {
  const roleIcon = userRole === "seller" ? <Store /> : <AccountCircle />;
  const roleLabel = userRole === "seller" ? "Продавец" : "Покупатель";

  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Avatar
        sx={{
          bgcolor: userRole === "seller" ? "secondary.main" : "primary.main",
        }}
      >
        {roleIcon}
      </Avatar>
      <Box flex={1}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="subtitle2" fontWeight={600}>
            {userInfo.login}
          </Typography>
          {isCurrentUser && (
            <Chip
              label="Это вы"
              size="small"
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
          {roleLabel}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Phone sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {userInfo.phoneNumber}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Email sx={{ fontSize: 14 }} />
          <Typography variant="caption" color="text.secondary">
            {userInfo.mail}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};
