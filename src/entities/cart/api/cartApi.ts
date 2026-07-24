import { ProductBasket, ProductBasketDto } from "../model/types";
import { attachImages } from "@/entities/image/@x/cart";
import { buildProductRequest } from "@/entities/product/@x/cart";
import { authClient } from "@/shared/api";
import type { FetchProductsParams } from "@/entities/product/@x/cart";

const API_URL = `/basket`;

export const cartApi = {
  getCart: async (params: FetchProductsParams): Promise<ProductBasket[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductBasketDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    const withImages = await attachImages(data, (item) => item.product.imageId);
    return withImages.map(({ image, ...item }) => ({
      ...item,
      product: { ...item.product, image },
    }));
  },

  addToCart: async (productId: number, count: number) => {
    await authClient.post(`${API_URL}?productId=${productId}&count=${count}`);
  },

  update: async (productId: number, count: number) => {
    await authClient.put(`${API_URL}?productId=${productId}&count=${count}`);
  },

  removeFromCart: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
