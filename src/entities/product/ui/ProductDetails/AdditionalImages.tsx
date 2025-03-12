import { Box, Grid } from "@mui/material";
import Image from "next/image";

const AdditionalImages: React.FC<{ images: string[] }> = ({ images }) => (
  <Box bgcolor="white" p="16px" mb="8px" borderRadius="20px">
    <Grid
      container
      spacing={1}
      sx={{ display: "flex", justifyContent: "space-between", m: 0 }}
    >
      {images.map((img, index) => (
        <Grid
          key={index}
          item
          xs={6}
          sm={3}
          lg={2}
          sx={{ width: "22%", aspectRatio: "1/1", position: "relative" }}
        >
          <Image
            src={img}
            alt={`Дополнительное изображение ${index + 1}`}
            fill
            style={{ objectFit: "cover", borderRadius: "4px" }}
            sizes="(max-width: 600px) 100px, 200px"
          />
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default AdditionalImages;
