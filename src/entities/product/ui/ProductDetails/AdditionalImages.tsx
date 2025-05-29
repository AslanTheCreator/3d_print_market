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
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // Определяем размеры миниатюр в зависимости от экрана
  const getThumbnailSize = () => {
    if (isMobile) return 60;
    if (isTablet) return 80;
    return 100; // desktop
  };

  const thumbnailSize = getThumbnailSize();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: "16px", sm: "20px", md: "24px" },
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: { xs: 2, sm: 2.5, md: 3 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1, sm: 1.5, md: 2 },
          overflowX: "auto",
          paddingBottom: { xs: 1, sm: 1.5 },
          // Стилизация скроллбара
          "&::-webkit-scrollbar": {
            height: { xs: 4, sm: 6, md: 8 },
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 4,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0,0,0,0.2)",
            borderRadius: 4,
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.3)",
            },
          },
          // Для Firefox
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(0,0,0,0.2) rgba(0,0,0,0.05)",
        }}
      >
        {images.map((img, index) => (
          <Box
            key={index}
            onClick={() => onImageClick(index)}
            sx={{
              flexShrink: 0,
              width: thumbnailSize,
              height: thumbnailSize,
              position: "relative",
              cursor: "pointer",
              borderRadius: { xs: "8px", sm: "10px", md: "12px" },
              overflow: "hidden",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              border: 2,
              borderColor:
                currentMainIndex === index ? "primary.main" : "transparent",
              "&:hover": {
                transform: isDesktop
                  ? "scale(1.08) translateY(-2px)"
                  : "scale(1.05)",
                boxShadow:
                  currentMainIndex === index
                    ? theme.shadows[8]
                    : theme.shadows[4],
                borderColor:
                  currentMainIndex === index ? "primary.dark" : "primary.light",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
              // Дополнительные эффекты для десктопа
              ...(isDesktop && {
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    currentMainIndex === index
                      ? "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)"
                      : "none",
                  pointerEvents: "none",
                  transition: "all 0.3s ease",
                },
                "&:hover::after": {
                  background:
                    "linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)",
                },
              }),
            }}
          >
            <Image
              src={img}
              alt={`Изображение ${index + 1}`}
              fill
              style={{
                objectFit: "cover",
                transition: "transform 0.3s ease",
              }}
              sizes={`${thumbnailSize}px`}
            />
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
