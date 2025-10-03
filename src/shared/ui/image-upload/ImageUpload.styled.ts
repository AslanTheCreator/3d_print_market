import { Box, styled } from "@mui/material";

export const ImageUploadContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  position: "relative",
}));

export const ImagePreviewContainer = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 150,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[100],
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  border: `1px solid ${theme.palette.divider}`,
  position: "relative",
  cursor: "pointer",
  transition: "all 0.3s ease",
  "&:hover": {
    borderColor: theme.palette.primary.main,
  },
  "&.dragover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.primary.light + "10",
  },
  [theme.breakpoints.up("sm")]: {
    height: 200,
  },
}));

export const ImagePreview = styled("img")({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

export const ImageOverlay = styled(Box)(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0,
  transition: "opacity 0.3s ease",
  ".image-preview-container:hover &": {
    opacity: 1,
  },
}));

export const HiddenInput = styled("input")({
  display: "none",
});

export const UploadButton = styled(Box)(({ theme }) => ({
  width: "100%",
  height: 56,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  cursor: "pointer",
  transition: "all 0.3s ease",
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontWeight: 500,
  fontSize: "0.875rem",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.hover,
  },
  "&.error": {
    borderColor: theme.palette.error.main,
    color: theme.palette.error.main,
  },
  "&.disabled": {
    cursor: "not-allowed",
    opacity: 0.6,
  },
}));
