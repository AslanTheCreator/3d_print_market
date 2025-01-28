"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Typography,
  Box,
  Grid,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import img from "../../../shared/assets/images/1.webp";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

const ProductCard = () => {
  // const [productCard, setProductCard] = useState(null);

  // useEffect(() => {
  //   const loadCard = async () => {
  //     try {
  //       const data = await fetchCards(); // Запрашиваем данные с POST-запросом
  //       setProductCard(data);
  //     } catch (err) {
  //       console.log((err as Error).message);
  //     }
  //   };
  //   loadCard();
  // });
  return (
    <Box pt={"10px"} bgcolor={"whitesmoke"}>
      <Typography component={"h2"} variant={"h3"}>
        Aslan
      </Typography>
      <Box mt={"15px"} width={"100%"}>
        <Image
          alt="главная картинка"
          src={img}
          width={800}
          height={800}
          layout="responsive"
          priority
        />
        <Grid container spacing={1}></Grid>
      </Box>
      <Stack direction={"row"} justifyContent={"space-between"}>
        <Box bgcolor={"white"} borderRadius={"0 0 20px 20px"} p={"8px"}>
          <Typography fontWeight={700} fontSize={29}>
            18 000&#8381;
          </Typography>
        </Box>
        <Box
          bgcolor={"white"}
          borderRadius={"0 0 20px 20px"}
          p={"8px"}
          alignContent={"center"}
        >
          <Link href={""}>
            <Stack direction={"row"} gap={"8px"}>
              <Stack direction={"row"} gap={"5px"}>
                <StarsIcon />
                <Typography
                  component={"span"}
                  fontWeight={600}
                  fontSize={"18px"}
                >
                  4,8
                </Typography>
              </Stack>
              <Typography>Продавец</Typography>
              <KeyboardArrowRightIcon />
            </Stack>
          </Link>
        </Box>
      </Stack>
      <Box
        position={"fixed"}
        bottom={0}
        left={0}
        width={"100%"}
        zIndex={10}
        padding={"20px 10px 10px 10px"}
        bgcolor={"white"}
        borderRadius={"20px 20px 0 0"}
      >
        <ButtonStyled
          sx={{ borderRadius: "12px", fontSize: "16px" }}
          variant="contained"
          fullWidth
        >
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
