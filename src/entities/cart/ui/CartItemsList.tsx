import { Stack } from "@mui/material";
import { CartItemCard } from "./CartItemCard";
import { CartProductModel } from "../model/types";

interface CartItemsListProps {
  items: CartProductModel[];
  onRemoveItem: (id: number) => void;
  removingItemIds: number[];
}

export const CartItemsList = ({
  items,
  onRemoveItem,
  removingItemIds,
}: CartItemsListProps) => {
  return (
    <Stack spacing={0}>
      {items.map((item) => (
        <CartItemCard
          key={item.id}
          {...item}
          onRemove={onRemoveItem}
          isRemoving={removingItemIds.includes(item.id)}
        />
      ))}
    </Stack>
  );
};
