"use client";
import React from "react";
import { Stack, Avatar, Box, Typography } from "@mui/material";
import { Store, AccountCircle } from "@mui/icons-material";
import type { ListOrdersModel } from "../model/types";

type UserRole = "seller" | "customer";

interface UserInfoProps {
  userInfo: ListOrdersModel["userInfo"];
  userRole: UserRole;
}

export const UserInfo: React.FC<UserInfoProps> = ({ userInfo, userRole }) => {
  const roleIcon = userRole === "seller" ? <Store /> : <AccountCircle />;

  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      {/* Аватар */}
      <Avatar
        sx={{
          width: { xs: 32, sm: 36 },
          height: { xs: 32, sm: 36 },
          bgcolor: userRole === "seller" ? "secondary.main" : "primary.main",
          fontSize: { xs: "0.85rem", sm: "0.95rem" },
        }}
      >
        {roleIcon}
      </Avatar>

      {/* Информация */}
      <Box flex={1} minWidth={0}>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{
            fontSize: { xs: "0.85rem", sm: "0.9rem" },
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mb: 0.25,
          }}
        >
          {userInfo.login}
        </Typography>

        <Stack spacing={0.15}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.7rem", sm: "0.75rem" },
              display: "block",
            }}
          >
            {userInfo.phoneNumber}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.68rem", sm: "0.72rem" },
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userInfo.mail}
          </Typography>
        </Stack>
      </Box>
    </Stack>
  );
};
