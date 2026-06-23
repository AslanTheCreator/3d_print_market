import type React from "react";
import { Box } from "@mui/material";

interface FullscreenViewerIndicatorsProps {
  currentIndex: number;
  imageCount: number;
  onSelect: (index: number) => void;
}

export const FullscreenViewerIndicators = ({
  currentIndex,
  imageCount,
  onSelect,
}: FullscreenViewerIndicatorsProps): React.ReactElement | null => {
  if (imageCount <= 1) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "absolute",
        bottom: { xs: 16, sm: 24, md: 32 },
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2,
        display: "flex",
        gap: 1,
        p: 1.5,
        bgcolor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: 3,
      }}
    >
      {Array.from({ length: imageCount }, (_, index) => (
        <Box
          key={index}
          onClick={() => onSelect(index)}
          sx={{
            width: { xs: 8, sm: 10 },
            height: { xs: 8, sm: 10 },
            borderRadius: "50%",
            bgcolor:
              currentIndex === index ? "white" : "rgba(255,255,255,0.3)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            "&:hover": {
              bgcolor:
                currentIndex === index ? "white" : "rgba(255,255,255,0.5)",
              transform: "scale(1.2)",
            },
          }}
        />
      ))}
    </Box>
  );
};
