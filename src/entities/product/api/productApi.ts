import {
  Product,
  ProductDetail,
  ProductCreateModel,
  ProductDto,
} from "../model/types";
import { imageApi } from "@/entities/image";
import { publicClient, authClient, buildProductRequest } from "@/shared/api";
import { FetchProductsParams } from "@/shared/types";

const API_URL_PRODUCT = `/product`;
const API_URL = `/products`;

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

export const productApi = {
  getProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await publicClient.post<ProductDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    return attachImagesToProducts(data);
  },

  getUserProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/my`,
      requestData,
    );

    return attachImagesToProducts(data);
  },

  getProductById: async (id: number): Promise<ProductDetail> => {
    const { data } = await publicClient.get<ProductDetail>(
      `${API_URL_PRODUCT}/${id}`,
    );
    const images = await imageApi.getImages(data.imageIds);

    return { ...data, image: images };
  },

  createProduct: async (data: ProductCreateModel) => {
    await authClient.post(`${API_URL}`, data);
  },

  extendProductExpiration: async (productId: number) => {
    await authClient.post(`${API_URL_PRODUCT}/extend/${productId}`);
  },
};
