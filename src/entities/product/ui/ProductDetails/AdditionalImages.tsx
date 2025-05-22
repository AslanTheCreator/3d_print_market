import { Box, Paper } from "@mui/material";
import Image, { StaticImageData } from "next/image";
import { useTheme, useMediaQuery } from "@mui/material";

interface AdditionalImagesProps {
  images: string[] | StaticImageData[];
  currentMainIndex: number;
  onImageClick: (index: number) => void;
}

export const AdditionalImages: React.FC<AdditionalImagesProps> = ({
  images,
  currentMainIndex,
  onImageClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "20px",
        p: 2,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          paddingBottom: 1,
          // Стилизация скроллбара
          "&::-webkit-scrollbar": {
            height: 6,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 3,
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "rgba(0,0,0,0.3)",
          },
        }}
      >
        {images.map((img, index) => (
          <Box
            key={index}
            onClick={() => onImageClick(index)}
            sx={{
              flexShrink: 0,
              width: isMobile ? 60 : 80, // Размер миниатюр
              height: isMobile ? 60 : 80,
              position: "relative",
              cursor: "pointer",
              borderRadius: "8px",
              overflow: "hidden",
              transition: "all 0.2s ease-in-out",
              border: 2,
              borderColor:
                currentMainIndex === index ? "primary.main" : "transparent",
              "&:hover": {
                transform: "scale(1.05)",
                boxShadow: theme.shadows[4],
              },
              "&:active": {
                transform: "scale(0.98)",
              },
            }}
          >
            <Image
              src={img}
              alt={`Изображение ${index + 1}`}
              fill
              style={{
                objectFit: "cover",
              }}
              sizes="80px"
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
