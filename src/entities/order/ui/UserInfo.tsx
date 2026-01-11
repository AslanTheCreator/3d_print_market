"use client";
import React from "react";
import { Stack, Avatar, Box, Typography, Chip } from "@mui/material";
import { Phone, Email, Store, AccountCircle } from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order";

type UserRole = "seller" | "customer";

interface UserInfoProps {
  userInfo: ListOrdersModel["userInfo"];
  userRole: UserRole;
}

export const UserInfo: React.FC<UserInfoProps> = ({ userInfo, userRole }) => {
  const roleIcon = userRole === "seller" ? <Store /> : <AccountCircle />;
  const roleLabel = userRole === "seller" ? "Продавец" : "Покупатель";

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      {/* Аватар */}
      <Avatar
        sx={{
          width: { xs: 36, sm: 40 },
          height: { xs: 36, sm: 40 },
          bgcolor: userRole === "seller" ? "secondary.main" : "primary.main",
          fontSize: { xs: "0.9rem", sm: "1rem" },
        }}
      >
        {roleIcon}
      </Avatar>

      {/* Информация */}
      <Box flex={1} minWidth={0}>
        <Stack
          direction="row"
          spacing={0.75}
          alignItems="center"
          sx={{ mb: 0.25 }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{
              fontSize: { xs: "0.85rem", sm: "0.9rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userInfo.login}
          </Typography>
          <Chip
            label={roleLabel}
            size="small"
            sx={{
              height: 16,
              fontSize: "0.6rem",
              fontWeight: 500,
            }}
          />
        </Stack>

        <Stack spacing={0.25}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Phone sx={{ fontSize: 12, color: "text.secondary" }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
            >
              {userInfo.phoneNumber}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <Email sx={{ fontSize: 12, color: "text.secondary" }} />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.7rem", sm: "0.75rem" },
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userInfo.mail}
            </Typography>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
};
