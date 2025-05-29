import { useState } from "react";
import { Paper, useTheme, useMediaQuery } from "@mui/material";
import { MainImage } from "./MainImage";
import { AdditionalImages } from "./AdditionalImages";

interface ImageGalleryProps {
  mainImage?: string;
  additionalImages: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  mainImage,
  additionalImages,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  // Создаем массив всех изображений
  const allImages = mainImage
    ? [mainImage, ...additionalImages]
    : additionalImages;

  // Состояние для индекса текущего главного изображения
  const [currentMainIndex, setCurrentMainIndex] = useState(0);

  // Функция для смены главного изображения
  const handleImageClick = (clickedIndex: number) => {
    setCurrentMainIndex(clickedIndex);
  };

  return (
    <>
      {/* Главное изображение */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: { xs: "16px", sm: "20px", md: "24px" },
          overflow: "hidden",
          mb: { xs: 1.5, sm: 2, md: 2.5 },
          // Увеличиваем высоту для больших экранов
          "& > div": {
            aspectRatio: {
              xs: "4/3",
              sm: "16/10",
              md: "3/2",
            },
          },
        }}
      >
        <MainImage src={allImages[currentMainIndex]} />
      </Paper>

      {/* Дополнительные изображения */}
      {allImages.length > 1 && (
        <AdditionalImages
          images={allImages}
          currentMainIndex={currentMainIndex}
          onImageClick={handleImageClick}
        />
      )}
    </>
  );
};
