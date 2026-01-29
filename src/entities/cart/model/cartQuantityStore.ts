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
  // Синхронизация с сервером
  syncWithServer: (serverItems: { productId: number; count: number }[]) => void;
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

      /**
       * Синхронизирует локальное состояние с данными сервера.
       * Добавляет новые товары, обновляет существующие, удаляет отсутствующие.
       */
      syncWithServer: (serverItems) => {
        set((state) => {
          const serverProductIds = new Set(serverItems.map((i) => i.productId));

          // Фильтруем локальные товары, оставляя только те, что есть на сервере
          const existingItems = state.items.filter((item) =>
            serverProductIds.has(item.productId),
          );

          // Создаём Map для быстрого доступа
          const localMap = new Map(
            existingItems.map((item) => [item.productId, item]),
          );

          // Обновляем или добавляем товары с сервера
          const newItems: CartQuantityItem[] = serverItems.map((serverItem) => {
            const localItem = localMap.get(serverItem.productId);

            // Если товара нет локально — берём серверный count
            if (!localItem) {
              return {
                productId: serverItem.productId,
                quantity: serverItem.count,
              };
            }

            // Если есть локально — оставляем локальное значение
            // (оно может быть более актуальным из-за оптимистичных обновлений)
            return localItem;
          });

          return { items: newItems };
        });
      },
    }),
    {
      name: "cart-quantity-storage",
    },
  ),
);
