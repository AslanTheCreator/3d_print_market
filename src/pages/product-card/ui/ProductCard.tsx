import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Typography,
  Breadcrumbs,
  Box,
  Grid,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import img from "../../../shared/assets/photo-8-2024-11-03-17-59-52_2.14640913.webp";
import { ButtonStyled } from "@/shared/ui";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const ProductCard = () => {
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
    <Box>
      <Breadcrumbs>
        <Link color="inherit" href="/">
          Каталог
        </Link>
        <Link color="inherit" href="/">
          Варгеймы
        </Link>
        <Typography sx={{ color: "text.primary" }}>Warhammer 40.000</Typography>
      </Breadcrumbs>
      <Typography component={"h2"} variant={"h3"}>
        Aslan
      </Typography>
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
      <Box>
        <Typography fontWeight={700} fontSize={29}>
          18 000&#8381;
        </Typography>
        <Typography fontSize={14}>В наличии 1 шт.</Typography>
        <ButtonStyled sx={{ marginTop: "15px" }} variant="contained">
          Добавить в корзину
        </ButtonStyled>
      </Box>
      <Box mt={"20px"}>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel1-content"
            id="panel1-header"
          >
            Описание товара
          </AccordionSummary>
          <AccordionDetails>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            malesuada lacus ex, sit amet blandit leo lobortis eget.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel2-content"
            id="panel2-header"
          >
            Обсуждение товара
          </AccordionSummary>
          <AccordionDetails>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            malesuada lacus ex, sit amet blandit leo lobortis eget.
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel3-content"
            id="panel3-header"
          >
            Отзывы о продавце
          </AccordionSummary>
          <AccordionDetails>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            malesuada lacus ex, sit amet blandit leo lobortis eget.
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
};

export default ProductCard;
