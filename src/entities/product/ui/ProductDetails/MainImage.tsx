import { Box, Typography } from "@mui/material";
import Image from "next/image";
export const MainImage: React.FC<{ src?: string }> = ({ src }) => (
  <Box
    mt="15px"
    width="100%"
    position="relative"
    overflow="hidden"
    sx={{
      aspectRatio: "4/3",
      borderRadius: "4px",
    }}
  >
    {src ? (
      <Image
        alt="Основное изображение товара"
        fill
        src={src}
        priority
        style={{
          objectFit: "cover",
          transition: "transform 0.3s ease-in-out",
        }}
        sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw"
      />
    ) : (
      <Box
        sx={{
          width: "100%",
          height: "100%",
          bgcolor: "grey.200",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Изображение отсутствует
        </Typography>
      </Box>
    )}
  </Box>
);
