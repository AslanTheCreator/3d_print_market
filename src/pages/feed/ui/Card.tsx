import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Typography,
  Stack,
  Box,
  IconButton,
  Card as CardMUI,
  CardContent,
} from "@mui/material";
import { ButtonStyled } from "@/shared/ui/Button";
import { CardItem } from "../../../shared/api/types";
import HeartIcon from "@/shared/assets/icons/HeartIcon";
import FavoriteBorderIcon from "@mui/icons-material/Favorite";
import { formatPrice } from "@/shared/lib/format";

const Card: React.FC<CardItem> = ({ id, name, price, image, category }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  return (
    <Link href={`/catalog/card/${id}`}>
      <CardMUI
        sx={{
          maxWidth: 180,
          borderRadius: 2,
          boxShadow: 2,
          overflow: "hidden",
          position: "relative",
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
              priority
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div>Изображение недоступно</div> // Или использовать заглушку
          )}
        </Box>

        {/* Кнопка "Избранное" */}
        <IconButton
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover": { backgroundColor: "rgba(255, 255, 255, 1)" },
          }}
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          <FavoriteBorderIcon />
        </IconButton>

        {/* Контент карточки */}
        <CardContent
          sx={{ p: "0 10px 10px 10px", mt: "4px", "&:last-child": { pb: 2 } }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
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
          </Stack>

          <Typography
            fontSize={14}
            noWrap
            sx={{
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {name}
          </Typography>
          <ButtonStyled variant="contained" fullWidth sx={{ marginTop: "8px" }}>
            Предзаказ
          </ButtonStyled>
        </CardContent>
      </CardMUI>
    </Link>
  );
};

export default Card;
