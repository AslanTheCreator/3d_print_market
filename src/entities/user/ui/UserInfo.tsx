import React from "react";
import { Box, Avatar, Typography, Button } from "@mui/material";
import { UserProfileModel } from "../model/types";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";

interface UserInfoProps {
  user: UserProfileModel;
  onEditProfile?: () => void;
}

export const UserInfo: React.FC<UserInfoProps> = ({ user, onEditProfile }) => {
  const userName = user.login;
  const hasImage = user.image && user.image[0]?.imageData;

  return (
    <Box
      sx={{
        p: 3,
        display: "flex",
        alignItems: "center",
        gap: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
      }}
    >
      {/* Аватар */}
      <Avatar
        src={
          hasImage
            ? `data:${user.image[0].contentType};base64,${user.image[0].imageData}`
            : undefined
        }
        alt={userName}
        sx={{
          width: 64,
          height: 64,
          border: "2px solid",
          borderColor: "primary.main",
          bgcolor: "primary.light",
        }}
      >
        {!hasImage && <PersonIcon sx={{ fontSize: 32 }} />}
      </Avatar>

      {/* Информация и кнопка */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            mb: 0.25,
            lineHeight: 1.2,
          }}
        >
          {userName}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          onClick={onEditProfile}
          sx={{
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.875rem",
            py: 0.75,
            px: 2,
          }}
        >
          Редактировать профиль
        </Button>
      </Box>
    </Box>
  );
};
