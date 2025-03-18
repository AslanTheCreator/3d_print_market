import React from "react";
import { Container, Divider, Stack } from "@mui/material";
import { CardItem } from "@/entities/product";
import CartItem from "./CartItem";

interface CartListProps {
  items: CardItem[];
}

const CartList = ({ items }: CartListProps) => {
  return (
    <Container sx={{ marginTop: "10px" }}>
      <Stack>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <CartItem {...item} />
            {index !== items.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Stack>
    </Container>
  );
};

export default CartList;
