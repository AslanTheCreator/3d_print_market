import { Grid, Box } from "@mui/material";
import Image from "next/image";
import img from "../../../shared/assets/photo-8-2024-11-03-17-59-52_2.14640913.webp";

export const ProductGallery = () => {
  const arrayImg = [
    {
      id: 1,
      img: img,
    },
    {
      id: 2,
      img: img,
    },
  ];
  return (
    <Box mt={"15px"}>
      <Image alt="главная картинка" src={img} width={290} height={290} />
      <Grid container spacing={1}>
        {arrayImg.map((_, index) => (
          <Grid item xs={3} key={index}>
            <Image
              alt="дополнительная картинка"
              src={img}
              width={65}
              height={65}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
