import { Box, Avatar, styled } from "@mui/material";

export const AvatarUploadContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  transition: "all 0.3s ease",
  cursor: "pointer",
  position: "relative",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  "&.dragover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + "10",
  },
}));

export const AvatarPreview = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  border: `4px solid ${theme.palette.background.paper}`,
  boxShadow: theme.shadows[4],
  fontSize: "3rem",
  "& .MuiAvatar-img": {
    objectFit: "cover",
  },
}));

export const AvatarOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  borderRadius: theme.shape.borderRadius * 2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  transition: "opacity 0.3s ease",
  ".avatar-upload:hover &": {
    opacity: 1,
  },
}));

export const HiddenInput = styled("input")({
  display: "none",
});
