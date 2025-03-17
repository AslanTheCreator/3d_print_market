import {
  Button,
  Container,
  Divider,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import React from "react";
import { useState, useEffect } from "react";
import { authenticate } from "@/shared/api/card";
import { useCartProducts } from "../hooks/useAddToCart";
import CartItem from "./CartItem";
import { ButtonStyled } from "@/shared/ui";

const CartItemList = () => {
  const [token, setToken] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loadToken = async () => {
      const authToken = await authenticate("user42", "stas");
      setToken(authToken);
    };
    loadToken();
  }, []);
  const { data: cartItems, isLoading, isError } = useCartProducts(token);
  if (isLoading) return <Typography>Загрузка...</Typography>;
  if (isError || !cartItems?.length) {
    return (
      <Container sx={{ marginTop: "10px", textAlign: "center" }}>
        <Box
          display={"flex"}
          flexDirection={"column"}
          alignItems={"flex-start"}
          gap={"10px"}
        >
          <Typography component={"h2"} fontSize={32} fontWeight={900}>
            Корзина пуста
          </Typography>
          <Typography
            component={"span"}
            fontSize={14}
            fontWeight={400}
            textAlign={"start"}
          >
            Воспользуйтесь поиском, чтобы найти всё, что нужно. Если в корзине
            были товары, войдите, чтобы посмотреть список.
          </Typography>
          <ButtonStyled
            variant="contained"
            onClick={() => router.push("/login")}
          >
            Войти
          </ButtonStyled>
        </Box>
      </Container>
    );
  }
  return (
    <Container sx={{ marginTop: "10px" }}>
      <Stack>
        {cartItems.map((item, index) => (
          <React.Fragment key={item.id}>
            <CartItem {...item} />
            {index !== cartItems.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Stack>
    </Container>
  );
};

export default CartItemList;
