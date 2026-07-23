import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartQuantityItem {
  productId: number;
  quantity: number;
}

export type CartQuantitySyncStatus =
  | "synced"
  | "pending"
  | "needsValidation";

export interface CartQuantitySyncState {
  revision: number;
  confirmedRevision: number;
  confirmedQuantity: number;
  status: CartQuantitySyncStatus;
}

export interface CartServerQuantityItem {
  productId: number;
  count: number;
}

export interface CartQuantityState {
  items: CartQuantityItem[];
  syncStates: Record<number, CartQuantitySyncState>;
  setQuantity: (productId: number, quantity: number) => number;
  incrementQuantity: (productId: number) => number;
  decrementQuantity: (productId: number) => number;
  getQuantity: (productId: number) => number;
  getSyncStatus: (productId: number) => CartQuantitySyncStatus;
  removeItem: (productId: number) => void;
  clearQuantities: () => void;
  getAllItems: () => CartQuantityItem[];
  syncWithServer: (serverItems: CartServerQuantityItem[]) => void;
  acknowledgeUpdate: (
    productId: number,
    revision: number,
    quantity: number,
  ) => void;
  validateUpdate: (
    productId: number,
    revision: number,
    serverQuantity: number | undefined,
  ) => void;
  rollbackUpdate: (productId: number, revision: number) => boolean;
  markNeedsValidation: (productId: number, revision: number) => void;
}

const replaceQuantity = (
  items: CartQuantityItem[],
  productId: number,
  quantity: number,
): CartQuantityItem[] => {
  const itemExists = items.some((item) => item.productId === productId);

  if (!itemExists) {
    return [...items, { productId, quantity }];
  }

  return items.map((item) =>
    item.productId === productId ? { ...item, quantity } : item,
  );
};

export const useCartQuantityStore = create<CartQuantityState>()(
  persist(
    (set, get) => ({
      items: [],
      syncStates: {},

      setQuantity: (productId, quantity) => {
        let revision = 0;

        set((state) => {
          const currentItem = state.items.find(
            (item) => item.productId === productId,
          );
          const currentSyncState = state.syncStates[productId];
          revision = (currentSyncState?.revision ?? 0) + 1;

          return {
            items: replaceQuantity(state.items, productId, quantity),
            syncStates: {
              ...state.syncStates,
              [productId]: {
                revision,
                confirmedRevision: currentSyncState?.confirmedRevision ?? 0,
                confirmedQuantity:
                  currentSyncState?.confirmedQuantity ??
                  currentItem?.quantity ??
                  quantity,
                status: "pending",
              },
            },
          };
        });

        return revision;
      },

      incrementQuantity: (productId) =>
        get().setQuantity(productId, get().getQuantity(productId) + 1),

      decrementQuantity: (productId) => {
        const currentQuantity = get().getQuantity(productId);

        if (currentQuantity <= 1) {
          return get().syncStates[productId]?.revision ?? 0;
        }

        return get().setQuantity(productId, currentQuantity - 1);
      },

      getQuantity: (productId) => {
        const item = get().items.find((item) => item.productId === productId);
        return item?.quantity ?? 1;
      },

      getSyncStatus: (productId) => {
        const state = get();
        const syncState = state.syncStates[productId];

        if (syncState) {
          return syncState.status;
        }

        return state.items.some((item) => item.productId === productId)
          ? "needsValidation"
          : "synced";
      },

      removeItem: (productId) => {
        set((state) => {
          const { [productId]: _removedSyncState, ...syncStates } =
            state.syncStates;

          return {
            items: state.items.filter((item) => item.productId !== productId),
            syncStates,
          };
        });
      },

      clearQuantities: () => {
        set({ items: [], syncStates: {} });
      },

      getAllItems: () => get().items,

      syncWithServer: (serverItems) => {
        set((state) => {
          const serverProductIds = new Set(
            serverItems.map((item) => item.productId),
          );
          const nextSyncStates: Record<number, CartQuantitySyncState> = {};

          const nextItems = serverItems.map((serverItem) => {
            const localItem = state.items.find(
              (item) => item.productId === serverItem.productId,
            );
            const syncState = state.syncStates[serverItem.productId];

            if (localItem && syncState?.status === "pending") {
              nextSyncStates[serverItem.productId] = syncState;
              return localItem;
            }

            const revision = syncState?.revision ?? 0;
            nextSyncStates[serverItem.productId] = {
              revision,
              confirmedRevision: revision,
              confirmedQuantity: serverItem.count,
              status: "synced",
            };

            return {
              productId: serverItem.productId,
              quantity: serverItem.count,
            };
          });

          state.items.forEach((localItem) => {
            const syncState = state.syncStates[localItem.productId];

            if (
              !serverProductIds.has(localItem.productId) &&
              syncState?.status === "pending"
            ) {
              nextItems.push(localItem);
              nextSyncStates[localItem.productId] = syncState;
            }
          });

          return { items: nextItems, syncStates: nextSyncStates };
        });
      },

      acknowledgeUpdate: (productId, revision, quantity) => {
        set((state) => {
          const syncState = state.syncStates[productId];

          if (!syncState || revision < syncState.confirmedRevision) {
            return state;
          }

          return {
            syncStates: {
              ...state.syncStates,
              [productId]: {
                ...syncState,
                confirmedRevision: revision,
                confirmedQuantity: quantity,
              },
            },
          };
        });
      },

      validateUpdate: (productId, revision, serverQuantity) => {
        set((state) => {
          const syncState = state.syncStates[productId];

          if (!syncState || syncState.revision !== revision) {
            return state;
          }

          if (serverQuantity === undefined) {
            return {
              syncStates: {
                ...state.syncStates,
                [productId]: { ...syncState, status: "needsValidation" },
              },
            };
          }

          return {
            items: replaceQuantity(state.items, productId, serverQuantity),
            syncStates: {
              ...state.syncStates,
              [productId]: {
                revision,
                confirmedRevision: revision,
                confirmedQuantity: serverQuantity,
                status: "synced",
              },
            },
          };
        });
      },

      rollbackUpdate: (productId, revision) => {
        let didRollback = false;

        set((state) => {
          const syncState = state.syncStates[productId];

          if (!syncState || syncState.revision !== revision) {
            return state;
          }

          didRollback = true;
          return {
            items: replaceQuantity(
              state.items,
              productId,
              syncState.confirmedQuantity,
            ),
            syncStates: {
              ...state.syncStates,
              [productId]: { ...syncState, status: "pending" },
            },
          };
        });

        return didRollback;
      },

      markNeedsValidation: (productId, revision) => {
        set((state) => {
          const syncState = state.syncStates[productId];

          if (!syncState || syncState.revision !== revision) {
            return state;
          }

          return {
            syncStates: {
              ...state.syncStates,
              [productId]: { ...syncState, status: "needsValidation" },
            },
          };
        });
      },
    }),
    {
      name: "cart-quantity-storage",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
