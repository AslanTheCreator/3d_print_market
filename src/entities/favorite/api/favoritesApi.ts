import { attachImages } from "@/entities/image/@x/favorite";
import { buildProductRequest } from "@/entities/product/@x/favorite";
import { authClient } from "@/shared/api";
import type {
  FetchProductsParams,
  Product,
  ProductDto,
} from "@/entities/product/@x/favorite";

const API_URL = `/favorites`;

export const favoritesApi = {
  getFavorites: async (params: FetchProductsParams, signal?: AbortSignal): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/find`,
      requestData,
      { signal },
    );

    return attachImages<ProductDto, Product>(data, (p) => p.imageId, signal);
  },

  addToFavorites: async (productId: number) => {
    await authClient.post(`${API_URL}?productId=${productId}`);
  },

  removeFromFavorites: async (productId: number) => {
    await authClient.delete(`${API_URL}?productId=${productId}`);
  },
};
