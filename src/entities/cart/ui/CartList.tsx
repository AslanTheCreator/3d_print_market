import React from "react";
import { Divider, Stack } from "@mui/material";
import CartItem from "./CartItem";
import { CartProductModel } from "../model/types";

interface CartListProps {
  items: CartProductModel[];
}

const CartList = ({ items }: CartListProps) => {
  return (
    <Stack>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <CartItem {...item} />
          {index !== items.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </Stack>
  );
};

export default CartList;
