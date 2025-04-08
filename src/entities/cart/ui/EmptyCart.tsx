import React from "react";
import { Box, Container, Typography } from "@mui/material";
import { useRouter } from "next/navigation";
import { ButtonStyled } from "@/shared/ui";

export const EmptyCart = () => {
  const router = useRouter();

  return (
    <Container sx={{ marginTop: "10px", textAlign: "center" }}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap="10px"
      >
        <Typography component="h2" fontSize={32} fontWeight={900}>
          Корзина пуста
        </Typography>
        <Typography
          component="span"
          fontSize={14}
          fontWeight={400}
          textAlign="start"
        >
          Воспользуйтесь поиском, чтобы найти всё, что нужно. Если в корзине
          были товары, войдите, чтобы посмотреть список.
        </Typography>
        <ButtonStyled variant="contained" onClick={() => router.push("/login")}>
          Войти
        </ButtonStyled>
      </Box>
    </Container>
  );
};
