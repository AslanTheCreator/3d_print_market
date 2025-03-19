import React from "react";
import { Box, Avatar, Typography } from "@mui/material";
import { User } from "../model/types";

interface UserInfoProps {
  user: User;
}

export const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }}
    >
      <Avatar
        src={user.imageIds}
        alt={`${user.fullName}`}
        sx={{
          width: 80,
          height: 80,
          border: "3px solid white",
          mb: 1,
        }}
      />
      <Typography variant="h6" component="h1">
        {user.fullName}
      </Typography>
    </Box>
  );
};
