import type { ProductBasket } from "@/entities/cart";
import type { Transfer } from "@/entities/transfer";

export interface SellerCartGroup {
  sellerId: number;
  sellerLogin: string;
  items: ProductBasket[];
}

interface SellerTransfersState {
  sellerId: number;
  transfers: Transfer[];
  isLoading: boolean;
  isError: boolean;
}

export const groupCartItemsBySeller = (
  cartItems: ProductBasket[],
): SellerCartGroup[] => {
  const groups = new Map<number, SellerCartGroup>();

  for (const item of cartItems) {
    const { sellerId, sellerLogin } = item.product;
    const group = groups.get(sellerId);

    if (group) {
      group.items.push(item);
      continue;
    }

    groups.set(sellerId, {
      sellerId,
      sellerLogin: sellerLogin || "Продавец",
      items: [item],
    });
  }

  return [...groups.values()];
};

export const getActiveTransfers = (transfers: Transfer[]): Transfer[] => {
  return transfers.filter((transfer) => transfer.status === "ACTIVE");
};

export const reconcileSelectedTransfers = (
  currentSelections: ReadonlyMap<number, Transfer>,
  sellerStates: SellerTransfersState[],
): Map<number, Transfer> => {
  const nextSelections = new Map<number, Transfer>();

  for (const sellerState of sellerStates) {
    const { sellerId, transfers, isLoading, isError } = sellerState;
    const currentSelection = currentSelections.get(sellerId);

    if (isLoading || isError) {
      if (currentSelection) {
        nextSelections.set(sellerId, currentSelection);
      }
      continue;
    }

    const availableSelection = currentSelection
      ? transfers.find((transfer) => transfer.id === currentSelection.id)
      : undefined;

    if (availableSelection) {
      nextSelections.set(sellerId, availableSelection);
      continue;
    }

    if (transfers.length === 1) {
      nextSelections.set(sellerId, transfers[0]);
    }
  }

  return nextSelections;
};

export const areTransferSelectionsEqual = (
  left: ReadonlyMap<number, Transfer>,
  right: ReadonlyMap<number, Transfer>,
): boolean => {
  if (left.size !== right.size) {
    return false;
  }

  for (const [sellerId, transfer] of left) {
    if (right.get(sellerId)?.id !== transfer.id) {
      return false;
    }
  }

  return true;
};
