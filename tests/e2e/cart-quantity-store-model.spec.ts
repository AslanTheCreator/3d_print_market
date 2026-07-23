import { expect, test } from "@playwright/test";
import { useCartQuantityStore } from "@/entities/cart/model/cartQuantityStore";

const resetStore = () => {
  useCartQuantityStore.setState({ items: [], syncStates: {} });
};

const getItemQuantity = (productId: number) =>
  useCartQuantityStore
    .getState()
    .items.find((item) => item.productId === productId)?.quantity;

test.describe("cart quantity store", () => {
  test.beforeEach(resetStore);

  test("initial server sync replaces an unconfirmed persisted quantity", () => {
    useCartQuantityStore.setState({
      items: [{ productId: 1, quantity: 7 }],
      syncStates: {},
    });

    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe(
      "needsValidation",
    );

    useCartQuantityStore
      .getState()
      .syncWithServer([{ productId: 1, count: 2 }]);

    expect(getItemQuantity(1)).toBe(2);
    expect(useCartQuantityStore.getState().syncStates[1]).toEqual({
      revision: 0,
      confirmedRevision: 0,
      confirmedQuantity: 2,
      status: "synced",
    });
  });

  test("a stale refetch does not overwrite a pending optimistic quantity", () => {
    const store = useCartQuantityStore.getState();
    store.syncWithServer([{ productId: 1, count: 1 }]);
    const revision = useCartQuantityStore.getState().setQuantity(1, 4);

    useCartQuantityStore
      .getState()
      .syncWithServer([{ productId: 1, count: 1 }]);

    expect(revision).toBe(1);
    expect(getItemQuantity(1)).toBe(4);
    expect(useCartQuantityStore.getState().syncStates[1]).toEqual({
      revision: 1,
      confirmedRevision: 0,
      confirmedQuantity: 1,
      status: "pending",
    });
  });

  test("confirms a successful update and rolls back a failed current revision", () => {
    useCartQuantityStore
      .getState()
      .syncWithServer([{ productId: 1, count: 1 }]);

    const confirmedRevision = useCartQuantityStore
      .getState()
      .setQuantity(1, 3);
    useCartQuantityStore
      .getState()
      .acknowledgeUpdate(1, confirmedRevision, 3);
    useCartQuantityStore
      .getState()
      .validateUpdate(1, confirmedRevision, 3);

    expect(getItemQuantity(1)).toBe(3);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("synced");

    const failedRevision = useCartQuantityStore
      .getState()
      .setQuantity(1, 5);
    expect(
      useCartQuantityStore.getState().rollbackUpdate(1, failedRevision),
    ).toBe(true);
    expect(getItemQuantity(1)).toBe(3);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("pending");

    useCartQuantityStore
      .getState()
      .markNeedsValidation(1, failedRevision);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe(
      "needsValidation",
    );

    useCartQuantityStore
      .getState()
      .validateUpdate(1, failedRevision, 3);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("synced");
  });

  test("an older revision cannot validate or roll back a newer change", () => {
    useCartQuantityStore
      .getState()
      .syncWithServer([{ productId: 1, count: 1 }]);

    const firstRevision = useCartQuantityStore
      .getState()
      .setQuantity(1, 2);
    const secondRevision = useCartQuantityStore
      .getState()
      .setQuantity(1, 3);

    useCartQuantityStore
      .getState()
      .acknowledgeUpdate(1, firstRevision, 2);
    useCartQuantityStore
      .getState()
      .validateUpdate(1, firstRevision, 2);

    expect(getItemQuantity(1)).toBe(3);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe("pending");
    expect(
      useCartQuantityStore.getState().rollbackUpdate(1, firstRevision),
    ).toBe(false);
    expect(getItemQuantity(1)).toBe(3);

    useCartQuantityStore
      .getState()
      .acknowledgeUpdate(1, secondRevision, 3);
    useCartQuantityStore
      .getState()
      .validateUpdate(1, secondRevision, 3);

    expect(useCartQuantityStore.getState().syncStates[1]).toEqual({
      revision: secondRevision,
      confirmedRevision: secondRevision,
      confirmedQuantity: 3,
      status: "synced",
    });
  });

  test("tracks revisions and failures independently for each product", () => {
    useCartQuantityStore.getState().syncWithServer([
      { productId: 1, count: 1 },
      { productId: 2, count: 5 },
    ]);

    const firstProductRevision = useCartQuantityStore
      .getState()
      .setQuantity(1, 2);
    const secondProductRevision = useCartQuantityStore
      .getState()
      .setQuantity(2, 6);

    expect(
      useCartQuantityStore
        .getState()
        .rollbackUpdate(1, firstProductRevision),
    ).toBe(true);
    useCartQuantityStore
      .getState()
      .markNeedsValidation(1, firstProductRevision);

    expect(getItemQuantity(1)).toBe(1);
    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe(
      "needsValidation",
    );
    expect(getItemQuantity(2)).toBe(6);
    expect(useCartQuantityStore.getState().getSyncStatus(2)).toBe("pending");

    useCartQuantityStore
      .getState()
      .acknowledgeUpdate(2, secondProductRevision, 6);
    useCartQuantityStore
      .getState()
      .validateUpdate(2, secondProductRevision, 6);

    expect(useCartQuantityStore.getState().getSyncStatus(1)).toBe(
      "needsValidation",
    );
    expect(useCartQuantityStore.getState().getSyncStatus(2)).toBe("synced");
  });
});
