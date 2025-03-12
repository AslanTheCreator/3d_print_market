import { Box } from "@mui/material";
import Image from "next/image";
const MainImage: React.FC<{ src?: string }> = ({ src }) => (
  <Box
    mt="15px"
    width="100%"
    position="relative"
    overflow="hidden"
    sx={{ aspectRatio: "246/328" }}
  >
    {src && (
      <Image
        alt="Основное изображение товара"
        fill
        src={src}
        priority
        style={{ objectFit: "cover" }}
      />
    )}
  </Box>
);

export default MainImage;
