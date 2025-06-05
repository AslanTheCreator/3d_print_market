import React from "react";
import { Box, Avatar, Typography } from "@mui/material";
import { UserProfileModel } from "../model/types";
import PersonIcon from "@mui/icons-material/Person";

interface UserInfoProps {
  user: UserProfileModel;
}

export const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  const displayName = user.fullName?.trim() ? user.fullName : user.login;
  const hasImage = user.image && user.image[0]?.imageData;

  return (
    <Box
      sx={{
        p: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        bgcolor: "primary.main",
        color: "primary.contrastText",
        borderRadius: 2,
      }}
    >
      <Avatar
        src={`data:${user.image[0]?.contentType};base64,${user.image[0]?.imageData}`}
        alt={displayName}
        sx={{
          width: 80,
          height: 80,
          border: "3px solid white",
          mb: 1,
          bgcolor: "secondary.light",
        }}
      >
        {!hasImage && <PersonIcon sx={{ fontSize: 40 }} color="secondary" />}
      </Avatar>
      <Typography variant="h6" component="h1">
        {displayName}
      </Typography>
    </Box>
  );
};
