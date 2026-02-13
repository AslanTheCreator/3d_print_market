import { Product } from "@/entities/product";
import { ProductDto } from "@/entities/product/model/types";
import { attachImages, imageApi } from "@/entities/image";
import { authClient, buildProductRequest } from "@/shared/api";
import { FetchProductsParams } from "@/shared/types";

const API_URL = `/favorites`;

export const favoritesApi = {
  getFavorites: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    return attachImages<ProductDto, Product>(data, (p) => p.imageId);
  },

  addToFavorites: async (productId: number) => {
    await authClient.post(`${API_URL}?productId=${productId}`);
  },

  removeFromFavorites: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
