import { ProductCreateModel } from "../model/types";
import { attachImages } from "@/shared/lib";
import {
  publicClient,
  authClient,
  buildProductRequest,
  imageApi,
} from "@/shared/api";
import {
  FetchProductsParams,
  Product,
  ProductDto,
  ProductDetail,
} from "@/shared/types";

const API_URL_PRODUCT = `/product`;
const API_URL = `/products`;

export const productApi = {
  getProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await publicClient.post<ProductDto[]>(
      `${API_URL}/find`,
      requestData,
    );

    return attachImages<ProductDto, Product>(data, (p) => p.imageId);
  },

  getUserProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/my`,
      requestData,
    );

    return attachImages<ProductDto, Product>(data, (p) => p.imageId);
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
    await authClient.post(`${API_URL}/extend/${productId}`);
  },
};
