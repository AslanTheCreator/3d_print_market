"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Typography,
  Box,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Stack,
  ImageList,
  ImageListItem,
  List,
  ListItem,
  Grid,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { useParams } from "next/navigation";
import { formatPrice } from "@/shared/lib/format";
import { fetchProductById } from "../api/service";
import { CardItem } from "../model/types";

const ProductDetails = () => {
  const params = useParams();
  const id = params?.id as string | undefined;

  const characteristics = [
    { label: "Материал", value: "Кожа" },
    { label: "Цвет", value: "Черный" },
    { label: "Размер", value: "42" },
    { label: "Вес", value: "1.2 кг" },
  ];

  const relatedProducts = [
    {
      id: 1,
    },
  ];

  const description = `Это прекрасный товар, который подойдёт для использования в различных условиях. 
  Долговечный, стильный и комфортный в использовании.`;

  const [productCard, setProductCard] = useState<CardItem | null>(null);

  useEffect(() => {
    const loadCard = async () => {
      try {
        if (id) {
          const data = await fetchProductById(id);
          setProductCard(data);
        }
      } catch (err) {
        console.log((err as Error).message);
      }
    };
    loadCard();
  }, [id]);
  const mainImage = productCard?.image?.[0]
    ? `data:${productCard.image[0].contentType};base64,${productCard.image[0].imageData}`
    : undefined;
  const additionalImages =
    productCard?.image
      ?.slice(1)
      .map((img) => `data:${img.contentType};base64,${img.imageData}`) || [];

  return (
    <Box pt={"10px"} bgcolor={"whitesmoke"}>
      <Typography component={"h2"} variant={"h3"} pl={"16px"}>
        {productCard?.name}
      </Typography>
      <Box>
        <Box
          mt={"15px"}
          width={"100%"}
          position={"relative"}
          overflow={"hidden"}
          sx={{ aspectRatio: "246/328" }}
        >
          {mainImage && (
            <Image
              alt="Основное изображение товара"
              fill
              src={`data:${productCard?.image[0].contentType};base64,${productCard?.image[0].imageData}`}
              priority
              style={{ objectFit: "cover" }}
            />
          )}
        </Box>
        <Box bgcolor={"white"} p={"16px"} mb={"8px"} borderRadius={"20px"}>
          <ImageList
            cols={4}
            gap={8}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              m: "0",
            }}
          >
            {additionalImages.map((img, index) => (
              <ImageListItem
                key={index}
                sx={{
                  width: "22%",
                  aspectRatio: "1 / 1",
                  position: "relative",
                }}
              >
                <Image
                  src={img}
                  alt={`Дополнительное изображение ${index + 1}`}
                  fill
                  style={{
                    objectFit: "cover",
                    borderRadius: "4px",
                  }}
                  sizes="(max-width: 600px) 100px, 200px" // Адаптивная загрузка
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      </Box>

      <Stack direction={"row"} justifyContent={"space-between"}>
        <Box bgcolor={"white"} borderRadius={"20px"} p={"8px 16px 8px 16px"}>
          <Typography fontWeight={700} fontSize={27}>
            {formatPrice(productCard?.price)}
          </Typography>
        </Box>
        <Box
          bgcolor={"white"}
          borderRadius={"20px"}
          p={"8px 16px 8px 16px"}
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

      <Box mt={"8px"} bgcolor={"white"} borderRadius={"20px"}>
        <Box
          sx={{
            maxWidth: 500,
            margin: "0 auto",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* Заголовок */}
          <Box p={"16px"}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              Характеристики и описание
            </Typography>
          </Box>

          {/* Характеристики */}
          <List sx={{ padding: 0 }}>
            {characteristics.map((item, index) => (
              <React.Fragment key={index}>
                <ListItem
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 16px",
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: "500" }}>
                    {item.label}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {item.value}
                  </Typography>
                </ListItem>
              </React.Fragment>
            ))}
          </List>

          {/* Accordion для описания */}
          <Accordion
            sx={{
              "&::before": {
                content: "none",
              },
              boxShadow: "none", // Убираем тени, если они не нужны
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                padding: "0 16px 0 16px",
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: "500" }}>
                Описание
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {description}
              </Typography>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
      <Box mt={"8px"} bgcolor={"white"} borderRadius={"20px"}>
        {/* Заголовок */}
        <Box p={"16px"}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Смотрите также
          </Typography>
        </Box>

        {/* Сетка карточек */}
        <Grid container spacing={"12px"} px={"16px"}>
          {relatedProducts.map((product) => (
            <Grid item xs={6} sm={6} key={product.id}>
              {/* Карточка товара */}
              {/* <Card
                id={product.id}
                name={product.name}
                price={product.price}
                image={""}
                category={product.category}
              /> */}
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductDetails;
