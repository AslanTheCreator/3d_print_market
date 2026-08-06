import type React from "react";
import { Box, ButtonBase } from "@mui/material";

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
        maxWidth: "calc(100% - 32px)",
        overflowX: "auto",
        p: 0.5,
        bgcolor: "rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)",
        borderRadius: 3,
        scrollbarWidth: "thin",
      }}
    >
      {Array.from({ length: imageCount }, (_, index) => (
        <ButtonBase
          key={index}
          onClick={() => onSelect(index)}
          aria-label={`Показать изображение ${index + 1} из ${imageCount}`}
          aria-current={currentIndex === index ? "true" : undefined}
          sx={{
            flex: "0 0 44px",
            width: 44,
            height: 44,
            borderRadius: 2,
            "&.Mui-focusVisible": {
              outline: "3px solid rgba(255,255,255,0.8)",
              outlineOffset: -3,
            },
            "&:hover > span": {
              bgcolor:
                currentIndex === index ? "white" : "rgba(255,255,255,0.5)",
              transform: "scale(1.2)",
            },
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              width: { xs: 8, sm: 10 },
              height: { xs: 8, sm: 10 },
              borderRadius: "50%",
              bgcolor:
                currentIndex === index ? "white" : "rgba(255,255,255,0.3)",
              transition: "all 0.2s ease",
            }}
          />
        </ButtonBase>
      ))}
    </Box>
  );
};
