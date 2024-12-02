"use client";

import { ButtonStyled } from "@/shared/ui/Button";
import { Box, Container, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const router = useRouter();

  return (
    <Container sx={{ marginTop: "10px" }}>
      <Box
        display={"flex"}
        flexDirection={"column"}
        alignItems={"flex-start"}
        gap={"10px"}
      >
        <Typography component={"h2"} fontSize={32} fontWeight={900}>
          Корзина пуста
        </Typography>
        <Typography component={"span"} fontSize={14} fontWeight={400}>
          Воспользуйтесь поиском, чтобы найти всё, что нужно. Если в Корзине
          были товары, войдите, чтобы посмотреть список
        </Typography>
        <ButtonStyled variant="contained" onClick={() => router.push("/login")}>
          Войти
        </ButtonStyled>
      </Box>
    </Container>
  );
}
