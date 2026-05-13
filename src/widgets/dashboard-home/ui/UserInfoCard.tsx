import React from "react";
import { Box, Avatar, Typography, Button } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EditIcon from "@mui/icons-material/Edit";
import { UserBaseModel } from "@/entities/user";
import { getImageUrl } from "@/shared/lib";

interface UserInfoCardProps {
  user: UserBaseModel;
  onEdit?: () => void;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({ user, onEdit }) => {
  const userName = user.login || user.fullName;
  const userImage = user.image?.[0];
  const userImageSrc = getImageUrl(userImage, "thumbnail");

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
        src={userImageSrc}
        alt={userName}
        sx={{
          width: 64,
          height: 64,
          border: "2px solid",
          borderColor: "primary.main",
          bgcolor: "primary.light",
        }}
      >
        {!userImageSrc && <PersonIcon sx={{ fontSize: 32 }} />}
      </Avatar>

      {/* Информация и кнопка */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            mb: 0.75,
            lineHeight: 1.2,
          }}
        >
          {userName}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<EditIcon />}
          onClick={onEdit}
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
