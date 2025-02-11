import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Typography, Stack, Box, IconButton, Button } from "@mui/material";
import { ButtonStyled } from "@/shared/ui/Button";
import { CardResponse } from "../../../shared/api/types";
import HeartIcon from "@/shared/assets/icons/HeartIcon";
import FavoriteBorderIcon from "@mui/icons-material/Favorite";
import { formatPrice } from "@/shared/lib/format";

const Card: React.FC<CardResponse> = ({ id, name, price, image, category }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  return (
    <Link href={`/catalog/card/${id}`}>
      <Box
        width={"100%"}
        position={"relative"}
        bgcolor={"white"}
        borderRadius={"12px"}
      >
        {/* {image && image[0]?.imageData ? (
          <Image
            alt={name}
            src={`data:${image[0].contentType};base64,${image[0].imageData}`}
            width={318}
            height={318}
            layout="responsive"
            priority
            style={{ borderRadius: "8px" }}
          />
        ) : (
          <div>Изображение недоступно</div> // Или использовать заглушку
        )} */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            //paddingTop: "75%", // Соотношение 516/688 ≈ 0.75

            overflow: "hidden",
            aspectRatio: " 516/688",
          }}
        >
          <Image
            alt={name}
            src={image}
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        </Box>
        <IconButton
          sx={{
            position: "absolute",
            top: "10px",
            right: "10px",
            zIndex: 1,
            transition: "transform 0.2s ease",
          }}
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          <FavoriteBorderIcon />
        </IconButton>
        <Box p={"0 10px 10px 10px"} mt={"4px"}>
          <Stack direction={"row"} justifyContent={"space-between"}>
            <Typography fontWeight={600} fontSize={"16px"} lineHeight={"22px"}>
              {formatPrice(price)}
            </Typography>

            <Typography fontSize={"13px"} color={"#818181"}>
              {category}
            </Typography>
          </Stack>
          <Typography
            fontSize={"14px"}
            textOverflow={"ellipsis"}
            whiteSpace={"nowrap"}
            overflow={"hidden"}
          >
            {name}
          </Typography>
          <ButtonStyled variant="contained" fullWidth sx={{ marginTop: "8px" }}>
            Предзаказ
          </ButtonStyled>
        </Box>
      </Box>
    </Link>
  );
};

export default Card;
