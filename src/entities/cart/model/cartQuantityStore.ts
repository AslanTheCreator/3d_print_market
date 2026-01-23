import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartQuantityItem {
  productId: number;
  quantity: number;
}

interface CartQuantityState {
  items: CartQuantityItem[];
  setQuantity: (productId: number, quantity: number) => void;
  incrementQuantity: (productId: number) => void;
  decrementQuantity: (productId: number) => void;
  getQuantity: (productId: number) => number;
  removeItem: (productId: number) => void;
  clearQuantities: () => void;
  getAllItems: () => CartQuantityItem[];
}

export const useCartQuantityStore = create<CartQuantityState>()(
  persist(
    (set, get) => ({
      items: [],

      setQuantity: (productId, quantity) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === productId,
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === productId ? { ...item, quantity } : item,
              ),
            };
          }

          return {
            items: [...state.items, { productId, quantity }],
          };
        });
      },

      incrementQuantity: (productId) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.productId === productId,
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }

          return {
            items: [...state.items, { productId, quantity: 1 }],
          };
        });
      },

      decrementQuantity: (productId) => {
        set((state) => {
          const item = state.items.find((i) => i.productId === productId);

          if (!item) return state;

          if (item.quantity <= 1) {
            return {
              items: state.items.filter((i) => i.productId !== productId),
            };
          }

          return {
            items: state.items.map((i) =>
              i.productId === productId
                ? { ...i, quantity: i.quantity - 1 }
                : i,
            ),
          };
        });
      },

      getQuantity: (productId) => {
        const item = get().items.find((item) => item.productId === productId);
        return item?.quantity ?? 1;
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      clearQuantities: () => {
        set({ items: [] });
      },

      getAllItems: () => {
        return get().items;
      },
    }),
    {
      name: "cart-quantity-storage",
    },
  ),
);
