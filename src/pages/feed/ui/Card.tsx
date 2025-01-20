import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Typography, Stack, Box, IconButton, Button } from "@mui/material";
import { ButtonStyled } from "@/shared/ui/Button";
import { CardResponse } from "../api/types";
import HeartIcon from "@/shared/assets/icons/HeartIcon";

const Card: React.FC<CardResponse> = ({ id, name, price, image }) => {
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  return (
    <Link href={`/catalog/card/${id}`}>
      <Box width={"100%"} maxWidth={"160px"} position={"relative"}>
        {image && image[0]?.imageData ? (
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
        )}
        <Button></Button>
        <IconButton
          sx={{
            position: "absolute",
            top: "5px",
            right: "5px",
            zIndex: 1,
            transition: "transform 0.2s ease",
          }}
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
        >
          <HeartIcon />
        </IconButton>
        <Box>
          <Stack
            direction={"row"}
            justifyContent={"space-between"}
            gap={"10px"}
          >
            <Typography fontWeight={700}>{price}&#8381;</Typography>

            <Typography fontSize={13} color={"#818181"}>
              Warhammer 40000
            </Typography>
          </Stack>
          <Typography fontSize={15}>{name}</Typography>
          <ButtonStyled variant="contained" fullWidth sx={{ marginTop: "8px" }}>
            Предзаказ
          </ButtonStyled>
        </Box>
      </Box>
    </Link>
  );
};

export default Card;
