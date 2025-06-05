import React from "react";
import { Stack } from "@mui/material";
import { CartItem } from "./CartItem";
import { CartProductModel } from "../model/types";

interface CartListProps {
  items: CartProductModel[];
}

export const CartList = ({ items }: CartListProps) => {
  return (
    <Stack spacing={0}>
      {items.map((item) => (
        <CartItem key={item.id} {...item} />
      ))}
    </Stack>
  );
};
