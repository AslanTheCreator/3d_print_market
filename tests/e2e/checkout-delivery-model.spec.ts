import { expect, test } from "@playwright/test";
import type { ProductBasket } from "@/entities/cart";
import type { Transfer } from "@/shared/types";
import {
  getActiveTransfers,
  groupCartItemsBySeller,
  reconcileSelectedTransfers,
} from "@/widgets/checkout/model/checkoutDeliveryGroups";

const productItem = (
  id: number,
  sellerId: number,
  sellerLogin: string,
): ProductBasket => {
  return {
    product: { id, sellerId, sellerLogin },
    count: 1,
  } as ProductBasket;
};

const transfer = (
  id: number,
  participantId: number,
  status: Transfer["status"] = "ACTIVE",
): Transfer => ({
  id,
  participantId,
  status,
  sending: "TRANSPORT_COMPANY",
  price: 500,
  currency: "RUB",
});

test.describe("checkout delivery model", () => {
  test("groups cart items by seller and preserves their order", () => {
    const groups = groupCartItemsBySeller([
      productItem(1, 10, "seller-a"),
      productItem(2, 20, "seller-b"),
      productItem(3, 10, "seller-a"),
    ]);

    expect(
      groups.map((group) => ({
        sellerId: group.sellerId,
        sellerLogin: group.sellerLogin,
        productIds: group.items.map((item) => item.product.id),
      })),
    ).toEqual([
      { sellerId: 10, sellerLogin: "seller-a", productIds: [1, 3] },
      { sellerId: 20, sellerLogin: "seller-b", productIds: [2] },
    ]);
  });

  test("filters deleted transfers", () => {
    expect(
      getActiveTransfers([
        transfer(1, 10),
        transfer(2, 10, "DELETED"),
      ]).map((item) => item.id),
    ).toEqual([1]);
  });

  test("auto-selects only a single option and preserves a valid choice", () => {
    const sellerOneTransfer = transfer(1, 10);
    const sellerTwoTransferA = transfer(2, 20);
    const sellerTwoTransferB = transfer(3, 20);
    const initialSelections = reconcileSelectedTransfers(new Map(), [
      {
        sellerId: 10,
        transfers: [sellerOneTransfer],
        isLoading: false,
        isError: false,
      },
      {
        sellerId: 20,
        transfers: [sellerTwoTransferA, sellerTwoTransferB],
        isLoading: false,
        isError: false,
      },
    ]);

    expect(initialSelections.get(10)?.id).toBe(1);
    expect(initialSelections.has(20)).toBe(false);

    const preservedSelections = reconcileSelectedTransfers(
      new Map([[20, sellerTwoTransferB]]),
      [
        {
          sellerId: 20,
          transfers: [sellerTwoTransferA, sellerTwoTransferB],
          isLoading: false,
          isError: false,
        },
      ],
    );

    expect(preservedSelections.get(20)?.id).toBe(3);
  });

  test("drops unavailable choices but preserves them during loading", () => {
    const selectedTransfer = transfer(1, 10);
    const currentSelections = new Map([[10, selectedTransfer]]);

    const loadingSelections = reconcileSelectedTransfers(currentSelections, [
      {
        sellerId: 10,
        transfers: [],
        isLoading: true,
        isError: false,
      },
    ]);
    expect(loadingSelections.get(10)?.id).toBe(1);

    const resolvedSelections = reconcileSelectedTransfers(currentSelections, [
      {
        sellerId: 10,
        transfers: [transfer(2, 10), transfer(3, 10)],
        isLoading: false,
        isError: false,
      },
    ]);
    expect(resolvedSelections.has(10)).toBe(false);
  });
});
