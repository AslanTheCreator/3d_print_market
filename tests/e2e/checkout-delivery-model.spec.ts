import { expect, test } from "@playwright/test";
import type { ProductBasket } from "@/entities/cart";
import type { Address, Transfer } from "@/shared/types";
import {
  getActiveTransfers,
  groupCartItemsBySeller,
  reconcileSelectedTransfers,
} from "@/widgets/checkout/model/checkoutDeliveryGroups";
import { getCheckoutSubmitReadiness } from "@/widgets/checkout/model/checkoutSubmitReadiness";
import type { SellerCheckoutGroup } from "@/widgets/checkout/model/types";

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

const selectedAddress = { id: 50 } as Address;
const verifiedUserState = {
  isLoadingCurrentUser: false,
  isCurrentUserError: false,
  hasOwnSelectedItems: false,
};

const sellerGroup = (
  overrides: Partial<SellerCheckoutGroup> = {},
): SellerCheckoutGroup => {
  const selectedTransfer = transfer(1, 10);

  return {
    sellerId: 10,
    sellerLogin: "seller-a",
    items: [productItem(1, 10, "seller-a")],
    transfers: [selectedTransfer],
    selectedTransfer,
    isActive: true,
    isLoading: false,
    isError: false,
    errorMessage: null,
    ...overrides,
  };
};

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

  test("explains why address selection blocks checkout", () => {
    const commonParams = {
      ...verifiedUserState,
      selectedAddress: null,
      addressesCount: 1,
      isLoadingAddresses: false,
      isAddressesError: false,
      selectedItemsCount: 1,
      activeSellerGroups: [sellerGroup()],
    };

    expect(getCheckoutSubmitReadiness(commonParams)).toEqual({
      isReadyToSubmit: false,
      submitBlockerMessage: "Выберите адрес доставки",
    });
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        addressesCount: 0,
      }).submitBlockerMessage,
    ).toBe("Добавьте адрес доставки в настройках профиля");
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        isLoadingAddresses: true,
      }).submitBlockerMessage,
    ).toBe("Загружаем адреса доставки");
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        isAddressesError: true,
      }).submitBlockerMessage,
    ).toBe("Не удалось загрузить адреса доставки");
  });

  test("points to the seller whose delivery is incomplete", () => {
    const commonParams = {
      ...verifiedUserState,
      selectedAddress,
      addressesCount: 1,
      isLoadingAddresses: false,
      isAddressesError: false,
      selectedItemsCount: 1,
    };

    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        activeSellerGroups: [
          sellerGroup({ selectedTransfer: null, transfers: [] }),
        ],
      }).submitBlockerMessage,
    ).toBe("У продавца «seller-a» нет доступных способов доставки");
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        activeSellerGroups: [sellerGroup({ selectedTransfer: null })],
      }).submitBlockerMessage,
    ).toBe("Выберите доставку продавца «seller-a»");
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        activeSellerGroups: [sellerGroup({ isLoading: true })],
      }).submitBlockerMessage,
    ).toBe("Загружаем доставку продавца «seller-a»");
    expect(
      getCheckoutSubmitReadiness({
        ...commonParams,
        activeSellerGroups: [sellerGroup({ isError: true })],
      }).submitBlockerMessage,
    ).toBe("Не удалось загрузить доставку продавца «seller-a»");
  });

  test("allows checkout only when address, items and delivery are ready", () => {
    expect(
      getCheckoutSubmitReadiness({
        ...verifiedUserState,
        selectedAddress,
        addressesCount: 1,
        isLoadingAddresses: false,
        isAddressesError: false,
        selectedItemsCount: 1,
        activeSellerGroups: [sellerGroup()],
      }),
    ).toEqual({
      isReadyToSubmit: true,
      submitBlockerMessage: null,
    });

    expect(
      getCheckoutSubmitReadiness({
        ...verifiedUserState,
        selectedAddress,
        addressesCount: 1,
        isLoadingAddresses: false,
        isAddressesError: false,
        selectedItemsCount: 0,
        activeSellerGroups: [],
      }).submitBlockerMessage,
    ).toBe("Выберите хотя бы один товар");
  });

  test("blocks checkout when an own product is selected", () => {
    expect(
      getCheckoutSubmitReadiness({
        ...verifiedUserState,
        selectedAddress,
        addressesCount: 1,
        isLoadingAddresses: false,
        isAddressesError: false,
        selectedItemsCount: 1,
        hasOwnSelectedItems: true,
        activeSellerGroups: [sellerGroup()],
      }),
    ).toEqual({
      isReadyToSubmit: false,
      submitBlockerMessage:
        "Нельзя оформить заказ на собственный товар. Снимите его выбор или удалите из корзины",
    });
  });
});
