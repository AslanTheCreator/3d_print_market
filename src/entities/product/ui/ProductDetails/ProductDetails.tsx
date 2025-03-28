"use client";

import React from "react";
import Link from "next/link";
import { Typography, Box, Stack } from "@mui/material";
import StarsIcon from "@/shared/assets/icons/StarsIcon";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import AddToCartButton from "@/features/cart/add-to-cart/ui/AddToCartButton";
import ProductPrice from "./ProductPrice";
import ProductCharacteristics from "./ProductCharacteristics";
import ProductDescription from "./ProductDescription";
import MainImage from "./MainImage";
import AdditionalImages from "./AdditionalImages";
import { useProductDetails } from "../../hooks/useProductDetails";

export const ProductDetails = () => {
  const {
    productCard,
    handleAddToCart,
    mainImage,
    additionalImages,
    isPending,
  } = useProductDetails();

  // Заглушка для характеристик
  const characteristics = [
    { label: "Материал", value: "Кожа" },
    { label: "Цвет", value: "Черный" },
    { label: "Размер", value: "42" },
    { label: "Вес", value: "1.2 кг" },
  ];

  if (isPending) {
    return <Typography>Загрузка...</Typography>;
  }

  return (
    <Box pt={"10px"} bgcolor={"whitesmoke"}>
      <Typography component={"h2"} variant={"h3"} pl={"16px"}>
        {productCard?.name}
      </Typography>
      <Box>
        <MainImage src={mainImage} />
        {additionalImages.length > 0 && (
          <AdditionalImages images={additionalImages} />
        )}
      </Box>
      <Stack direction={"row"} justifyContent={"space-between"}>
        <ProductPrice price={productCard?.price} />
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
          <ProductCharacteristics characteristics={characteristics} />
          <ProductDescription description={productCard?.description} />
        </Box>
      </Box>
      <Box mt={"8px"} bgcolor={"white"} borderRadius={"20px"}>
        {/* Заголовок */}
        <Box p={"16px"}>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Смотрите также
          </Typography>
        </Box>
      </Box>
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
        <AddToCartButton onAddToCart={handleAddToCart} />
      </Box>
    </Box>
  );
};
