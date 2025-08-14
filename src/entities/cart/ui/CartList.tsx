import { Stack } from "@mui/material";
import { CartItem } from "./CartItem";
import { CartProductModel } from "../model/types";

interface CartListProps {
  items: CartProductModel[];
  onRemoveItem: (id: number) => void;
  removingItemIds: number[];
}

export const CartList = ({
  items,
  onRemoveItem,
  removingItemIds,
}: CartListProps) => {
  return (
    <Stack spacing={0}>
      {items.map((item) => (
        <CartItem
          key={item.id}
          {...item}
          onRemove={onRemoveItem}
          isRemoving={removingItemIds.includes(item.id)}
        />
      ))}
    </Stack>
  );
};
