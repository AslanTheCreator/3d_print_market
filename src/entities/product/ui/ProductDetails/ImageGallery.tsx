import { useState } from "react";
import { Paper } from "@mui/material";
import { MainImage } from "./MainImage";
import { AdditionalImages } from "./AdditionalImages";
import img from "@/shared/assets/cat.jpg";
import img2 from "@/shared/assets/images/cat2.webp";

interface ImageGalleryProps {
  mainImage?: string;
  additionalImages: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  mainImage,
  additionalImages,
}) => {
  //const mockImages = [img, img2, img, img2, img, img2, img, img, img, img];
  //Создаем массив всех изображений
  const allImages = mainImage
    ? [mainImage, ...additionalImages]
    : additionalImages;
  //const allImages = mockImages;

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
          borderRadius: { xs: "16px", sm: "20px" },
          overflow: "hidden",
          mb: { xs: 1.5, sm: 2 },
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
