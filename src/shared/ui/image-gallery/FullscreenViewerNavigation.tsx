import type React from "react";
import { IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";

interface FullscreenViewerNavigationProps {
  imageCount: number;
  onNext: () => void;
  onPrevious: () => void;
}

const getNavigationButtonSx = (side: "left" | "right") => ({
  position: "absolute",
  [side]: { xs: 8, sm: 16, md: 24 },
  top: "50%",
  transform: "translateY(-50%)",
  color: "white",
  bgcolor: "rgba(255,255,255,0.1)",
  backdropFilter: "blur(10px)",
  width: { xs: 44, sm: 48, md: 56 },
  height: { xs: 44, sm: 48, md: 56 },
  "&:hover": {
    bgcolor: "rgba(255,255,255,0.2)",
    transform: "translateY(-50%) scale(1.1)",
  },
  transition: "all 0.2s ease",
  zIndex: 2,
});

export const FullscreenViewerNavigation = ({
  imageCount,
  onNext,
  onPrevious,
}: FullscreenViewerNavigationProps): React.ReactElement | null => {
  if (imageCount <= 1) {
    return null;
  }

  return (
    <>
      <IconButton
        onClick={onPrevious}
        aria-label="Предыдущее изображение"
        sx={getNavigationButtonSx("left")}
      >
        <ChevronLeft sx={{ fontSize: { xs: 28, sm: 32, md: 36 } }} />
      </IconButton>
      <IconButton
        onClick={onNext}
        aria-label="Следующее изображение"
        sx={getNavigationButtonSx("right")}
      >
        <ChevronRight sx={{ fontSize: { xs: 28, sm: 32, md: 36 } }} />
      </IconButton>
    </>
  );
};
