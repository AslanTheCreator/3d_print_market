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

interface ProductSitemapItem {
  id: number;
  createdAt: string;
  price: number;
}

const getProductDtos = async (
  params: FetchProductsParams,
): Promise<ProductDto[]> => {
  const requestData = buildProductRequest(params);
  const client = requestData.includeAdult ? authClient : publicClient;
  const { data } = await client.post<ProductDto[]>(
    `${API_URL}/find`,
    requestData,
  );

  return data;
};

export const productApi = {
  getProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const data = await getProductDtos(params);

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

  getUserProducts: async (params: FetchProductsParams): Promise<Product[]> => {
    const requestData = buildProductRequest(params);
    const { data } = await authClient.post<ProductDto[]>(
      `${API_URL}/my`,
      requestData,
    );

    return attachImages<ProductDto, Product>(data, (p) => p.imageId);
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
    );
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
