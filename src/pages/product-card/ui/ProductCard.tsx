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
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import img from "../../../shared/assets/images/1.webp";
import img2 from "../../../shared/assets/images/2.webp";
import img3 from "../../../shared/assets/images/3.webp";
import img4 from "../../../shared/assets/images/4.webp";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

const ProductCard = () => {
  const additionalImages = [img, img2, img3, img4];

  const relatedProducts = [
    {
      id: 1,
      image: img,
      price: "1999 ₽",
      category: "Обувь",
      name: "Кроссовки Adidas",
    },
    {
      id: 2,
      image: img2,
      price: "2499 ₽",
      category: "Сумки",
      name: "Сумка Gucci",
    },
    {
      id: 3,
      image: img3,
      price: "1599 ₽",
      category: "Одежда",
      name: "Куртка Zara",
    },
    {
      id: 4,
      image: img4,
      price: "999 ₽",
      category: "Аксессуары",
      name: "Часы Casio",
    },
  ];

  const characteristics = [
    { label: "Материал", value: "Кожа" },
    { label: "Цвет", value: "Черный" },
    { label: "Размер", value: "42" },
    { label: "Вес", value: "1.2 кг" },
  ];

  const description = `Это прекрасный товар, который подойдёт для использования в различных условиях. 
  Долговечный, стильный и комфортный в использовании.`;
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
      <Typography component={"h2"} variant={"h3"} pl={"16px"}>
        Aslan
      </Typography>
      <Box>
        <Box
          mt={"15px"}
          width={"100%"}
          position={"relative"}
          overflow={"hidden"}
          sx={{ aspectRatio: "246/328" }}
        >
          <Image
            alt="Основное изображение товара"
            fill
            src={img}
            priority
            style={{ objectFit: "cover" }}
          />
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
            18 000&#8381;
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
        <Grid container spacing={2} px={"16px"}>
          {relatedProducts.map((product) => (
            <Grid item xs={6} sm={6} key={product.id}>
              {/* Карточка товара */}
              <Card sx={{ borderRadius: 2, overflow: "hidden", boxShadow: 3 }}>
                {/* Изображение */}
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: 180, // Высота блока для изображения
                  }}
                >
                  <Image
                    src={product.image}
                    alt={product.name}
                    layout="fill"
                    objectFit="cover"
                    priority={true}
                  />
                </Box>

                {/* Контент карточки */}
                <CardContent>
                  {/* Цена и категория */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 1,
                    }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                      {product.price}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      {product.category}
                    </Typography>
                  </Box>

                  {/* Название товара */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "500",
                      color: "text.primary",
                      marginBottom: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={product.name}
                  >
                    {product.name}
                  </Typography>

                  {/* Кнопка Купить */}
                  <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ textTransform: "none", fontWeight: "bold" }}
                  >
                    Купить
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default ProductCard;
