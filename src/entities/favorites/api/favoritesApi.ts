import { Product } from "@/entities/product";
import { ProductDto } from "@/entities/product/model/types";
import { imageApi } from "@/entities/image";
import { authClient, buildProductRequest } from "@/shared/api";
import { FetchProductsParams } from "@/shared/types";

const API_URL = `/favorites`;

/**
 * Загружает картинки для списка товаров
 */
const attachImagesToProducts = async (
  products: ProductDto[],
): Promise<Product[]> => {
  return Promise.all(
    products.map(async (product) => {
      const images =
        product.imageId !== undefined
          ? await imageApi.getImages(product.imageId)
          : [];
      return { ...product, image: images };
    }),
  );
};

export const favoritesApi = {
  getFavorites: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    return attachImagesToProducts(data);
  },

  addToFavorites: async (productId: number) => {
    await authClient.post(`${API_URL}?productId=${productId}`);
  },

  removeFromFavorites: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
