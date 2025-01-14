import React from "react";
import { Box, Stack, TextField, Typography, Container } from "@mui/material";
import { ButtonStyled } from "@/shared/ui";

export default function ProfilePage() {
  return (
    <Container>
      <Typography component={"h2"}>Профиль</Typography>
      <Box
        component={"form"}
        display={"flex"}
        flexDirection={"column"}
        alignItems={"center"}
        justifyContent={"center"}
        gap={"5px"}
      >
        <Stack gap={"5px"} width={"100%"}>
          <TextField placeholder="Ник" />
          <TextField placeholder="Адрес страницы" />
          <TextField placeholder="Номер телефона" />
          <TextField placeholder="Email" />
          <TextField placeholder="Город" />
        </Stack>
        <ButtonStyled variant="contained" sx={{ width: "100%" }}>
          Сохранить
        </ButtonStyled>
      </Box>
      <Typography component={"h2"}>Доставка</Typography>
      <Box
        component={"form"}
        display={"flex"}
        flexDirection={"column"}
        alignItems={"center"}
        justifyContent={"center"}
        gap={"5px"}
      >
        <Stack gap={"5px"} width={"100%"}>
          <TextField placeholder="Фамилия" />
          <TextField placeholder="Имя" />
          <TextField placeholder="Отчество" />
          <TextField placeholder="Регион" />
          <TextField placeholder="Город" />
          <TextField placeholder="Индекс" />
          <TextField placeholder="Улица, дом, квартира" />
        </Stack>
        <ButtonStyled variant="contained" sx={{ width: "100%" }}>
          Сохранить
        </ButtonStyled>
      </Box>
    </Container>
  );
}
