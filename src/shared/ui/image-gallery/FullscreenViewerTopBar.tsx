import type React from "react";
import { Box, IconButton, Stack, Typography } from "@mui/material";
import { Close, ZoomIn, ZoomOut } from "@mui/icons-material";

interface FullscreenViewerTopBarProps {
  currentIndex: number;
  imageCount: number;
  zoom: number;
  onClose: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const controlButtonSx = {
  color: "white",
  bgcolor: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  "&:hover": {
    bgcolor: "rgba(255,255,255,0.2)",
  },
  "&:disabled": {
    color: "rgba(255,255,255,0.3)",
  },
};

export const FullscreenViewerTopBar = ({
  currentIndex,
  imageCount,
  zoom,
  onClose,
  onZoomIn,
  onZoomOut,
}: FullscreenViewerTopBarProps): React.ReactElement => {
  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        background:
          "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
        p: { xs: 1, sm: 2 },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h6"
          sx={{
            color: "white",
            fontSize: { xs: "0.875rem", sm: "1rem" },
            fontWeight: 600,
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {currentIndex + 1} / {imageCount}
        </Typography>

        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={onZoomOut}
            disabled={zoom <= 1}
            aria-label="Уменьшить изображение"
            sx={{
              ...controlButtonSx,
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            <ZoomOut />
          </IconButton>
          <IconButton
            onClick={onZoomIn}
            disabled={zoom >= 3}
            aria-label="Увеличить изображение"
            sx={{
              ...controlButtonSx,
              display: { xs: "none", sm: "inline-flex" },
            }}
          >
            <ZoomIn />
          </IconButton>
          <IconButton
            onClick={onClose}
            aria-label="Закрыть полноэкранную галерею"
            sx={controlButtonSx}
          >
            <Close />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
};
