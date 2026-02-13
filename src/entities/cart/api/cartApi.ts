import { ProductBasket, ProductBasketDto } from "../model/types";
import { imageApi, attachImages } from "@/entities/image";
import { authClient, buildProductRequest } from "@/shared/api";
import { FetchProductsParams } from "@/shared/types";

const API_URL = `/basket`;

export const cartApi = {
  getCart: async (params: FetchProductsParams): Promise<ProductBasket[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductBasketDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    const withImages = await attachImages(data, (item) => item.product.imageId);
    return withImages.map((item) => ({
      product: { ...item.product, image: item.image },
      count: item.count,
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
