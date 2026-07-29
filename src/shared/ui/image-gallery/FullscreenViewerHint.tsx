import type React from "react";
import { Box, Fade, Typography } from "@mui/material";

interface FullscreenViewerHintProps {
  open: boolean;
  zoom: number;
}

export const FullscreenViewerHint = ({
  open,
  zoom,
}: FullscreenViewerHintProps): React.ReactElement | null => {
  if (zoom !== 1) {
    return null;
  }

  return (
    <Fade in={open} timeout={1000}>
      <Box
        sx={{
          position: "absolute",
          bottom: { sm: 80, md: 100 },
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1,
          display: { xs: "none", sm: "block" },
          textAlign: "center",
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.875rem",
          animation: "fadeOut 3s ease-in-out forwards",
          "@keyframes fadeOut": {
            "0%": { opacity: 1 },
            "70%": { opacity: 1 },
            "100%": { opacity: 0 },
          },
        }}
      >
        <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
          Используйте ← → для навигации
        </Typography>
        <Typography variant="caption" sx={{ display: "block" }}>
          + / - для зума • Перетаскивайте при зуме
        </Typography>
      </Box>
    </Fade>
  );
};
