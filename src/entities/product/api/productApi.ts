import { ProductCreateModel } from "../model/types";
import { attachImages, imageApi } from "@/entities/image/@x/product";
import { authClient, publicClient } from "@/shared/api";
import { ApiError } from "@/shared/lib/errorHandler";
import { ProductNotFoundError } from "../lib/ProductNotFoundError";
import { buildProductRequest } from "../lib/buildProductRequest";
import type { FetchProductsParams } from "../model/productRequest";
import type { Product, ProductDetail, ProductDto } from "../model/types";

const API_URL_PRODUCT = `/product`;
const API_URL = `/products`;

interface ProductSitemapItem {
  id: number;
  createdAt: string;
  price: number;
}

const getProductDtos = async (
  params: FetchProductsParams,
  authenticated = false,
): Promise<ProductDto[]> => {
  const requestData = buildProductRequest(params);
  const client = authenticated ? authClient : publicClient;
  const { data } = await client.post<ProductDto[]>(
    `${API_URL}/find`,
    requestData,
  );

  return data;
};

export const productApi = {
  getProducts: async (
    params: FetchProductsParams,
    authenticated = false,
  ): Promise<Product[]> => {
    const data = await getProductDtos(params, authenticated);

    return attachImages<ProductDto, Product>(data, (p) => p.imageId);
  },

  getProductSitemapItems: async (
    params: FetchProductsParams,
  ): Promise<ProductSitemapItem[]> => {
    const data = await getProductDtos(params);

    return data.map((product) => ({
      id: product.id,
      createdAt: product.createdAt,
      price: product.price,
    }));
  },

  getUserProducts: async (params: FetchProductsParams, signal?: AbortSignal): Promise<ProductDto[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/my`,
      requestData,
      { signal },
    );

    return data;
  },

  findProductNames: async (name: string): Promise<string[]> => {
    const { data } = await publicClient.post<string[]>(
      `${API_URL}/names/find`,
      undefined,
      {
        params: { name },
      },
    );

    return data;
  },

  getProductById: async (id: number): Promise<ProductDetail> => {
    const { data } = await publicClient.get<ProductDetail>(
      `${API_URL_PRODUCT}/${id}`,
    ).catch((error: unknown) => {
      if (error instanceof ApiError && error.statusCode === 404) throw new ProductNotFoundError();
      throw error;
    });
    const images = await imageApi.getImageMetadata(data.imageIds);

    return { ...data, image: images };
  },

  createProduct: async (data: ProductCreateModel) => {
    await authClient.post(`${API_URL}`, data);
  },

  updateProduct: async (id: number, data: ProductCreateModel) => {
    await authClient.put(`${API_URL_PRODUCT}/${id}`, data);
  },

  deleteProduct: async (id: number) => {
    await authClient.delete(`${API_URL_PRODUCT}/${id}`);
  },

  extendProductExpiration: async (productId: number) => {
    await authClient.post(`${API_URL}/extend/${productId}`);
  },
};
