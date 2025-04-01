import { Box, Grid, Paper } from "@mui/material";
import Image from "next/image";

export const AdditionalImages: React.FC<{ images: string[] }> = ({
  images,
}) => (
  <Paper
    elevation={0}
    sx={{
      borderRadius: "20px",
      p: 2,
      mb: 2,
    }}
  >
    <Grid container spacing={1}>
      {images.map((img, index) => (
        <Grid
          key={index}
          item
          xs={3}
          sm={2}
          lg={2}
          sx={{ width: "22%", aspectRatio: "1/1", position: "relative" }}
        >
          <Box
            sx={{
              position: "relative",
              aspectRatio: "1/1",
              borderRadius: "8px",
              overflow: "hidden",
              cursor: "pointer",
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            <Image
              src={img}
              alt={`Дополнительное изображение ${index + 1}`}
              fill
              style={{
                objectFit: "cover",
              }}
              sizes="(max-width: 600px) 25vw, (max-width: 900px) 16vw, 12vw"
            />
          </Box>
        </Grid>
      ))}
    </Grid>
  </Paper>
);
