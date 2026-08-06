import { alpha, Avatar, Box, ButtonBase, styled } from "@mui/material";

export const AvatarUploadContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1.5),
  padding: theme.spacing(2.5),
  border: `2px dashed ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  transition: "all 0.3s ease",
  position: "relative",
  "&:focus-within": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  "&.dragover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + "10",
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius * 1.5,
  },
}));

export const AvatarSelectButton = styled(ButtonBase)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1.5),
  width: "100%",
  borderRadius: theme.shape.borderRadius * 1.5,
  cursor: "pointer",
  "&.Mui-focusVisible": {
    outline: `3px solid ${alpha(theme.palette.primary.main, 0.45)}`,
    outlineOffset: 4,
  },
  "&.Mui-disabled": {
    cursor: "wait",
    opacity: 0.7,
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
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
  [theme.breakpoints.down("sm")]: {
    width: 96,
    height: 96,
    borderWidth: 3,
    fontSize: "2.5rem",
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
  pointerEvents: "none",
  ".avatar-select:hover &, .avatar-select.Mui-focusVisible &": {
    opacity: 1,
  },
  [theme.breakpoints.down("sm")]: {
    borderRadius: theme.shape.borderRadius * 1.5,
  },
}));

export const HiddenInput = styled("input")({
  display: "none",
});
