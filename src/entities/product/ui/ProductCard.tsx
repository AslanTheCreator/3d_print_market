"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Typography,
  Stack,
  Box,
  IconButton,
  Card,
  CardContent,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui/Button";
import { CardItem } from "../model/types";
import HeartIcon from "@/shared/assets/icons/HeartIcon";
import FavoriteBorderIcon from "@mui/icons-material/Favorite";
import { formatPrice } from "@/shared/lib/formatPrice";

const ProductCard: React.FC<CardItem> = ({
  id,
  name,
  price,
  image,
  category,
}) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  return (
    <Link href={`/catalog/card/${id}`}>
      <Card
        sx={{
          maxWidth: 180,
          borderRadius: 2,
          boxShadow: 2,
          overflow: "hidden",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%", // Растягиваем карточку на всю высоту
        }}
      >
        {/* Блок с изображением */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "516/688",
            overflow: "hidden",
          }}
        >
          {image && image[0]?.imageData ? (
            <Image
              alt={name}
              src={`data:${image[0].contentType};base64,${image[0].imageData}`}
              fill
              loading="lazy"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div>Изображение недоступно</div>
          )}
        </Box>

        {/* Кнопка "Избранное" */}
        <IconButton
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1,
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "transparent",
            },
          }}
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          <FavoriteBorderIcon
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              "&:hover": { color: "rgba(255, 255, 255, 1)" }, // Меняем цвет иконки при наведении
            }}
          />
        </IconButton>

        {/* Контент карточки */}
        <CardContent
          sx={{
            p: "0 10px 10px 10px",
            mt: "4px",
            "&:last-child": { pb: 2 },
            flexGrow: 1, // Растягиваем контент на оставшееся пространство
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between", // Равномерно распределяем контент
          }}
        >
          <Stack>
            <Typography fontWeight={600} fontSize={16} lineHeight={"22px"}>
              {formatPrice(price)}
            </Typography>
            <Typography
              fontSize={13}
              color="text.secondary"
              noWrap
              sx={{
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {category?.name}
            </Typography>

            <Typography
              fontSize={12}
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2, // Ограничиваем текст двумя строками
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minHeight: "40px", // Фиксированная высота для текста
              }}
            >
              {name}
            </Typography>
          </Stack>

          <ButtonStyled variant="contained" fullWidth sx={{ marginTop: "8px" }}>
            Предзаказ
          </ButtonStyled>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
