import { ProductBasket, ProductBasketDto } from "../model/types";
import { imageApi } from "@/entities/image";
import { authClient, buildProductRequest } from "@/shared/api";
import { FetchProductsParams } from "@/shared/types";

const API_URL = `/basket`;

/**
 * Загружает картинки для товаров в корзине
 */
const attachImagesToBasketItems = async (
  items: ProductBasketDto[],
): Promise<ProductBasket[]> => {
  return Promise.all(
    items.map(async (item) => {
      const images =
        item.product.imageId !== undefined
          ? await imageApi.getImages(item.product.imageId)
          : [];

      return {
        product: { ...item.product, image: images },
        count: item.count,
      };
    }),
  );
};

export const cartApi = {
  getCart: async (params: FetchProductsParams): Promise<ProductBasket[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductBasketDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    return attachImagesToBasketItems(data);
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
