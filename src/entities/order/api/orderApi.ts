import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import {
  OrderCreateModel,
  OrderGetDataModel,
  SellerOrdersModel,
} from "../model/types";

const authenticatedAxios = createAuthenticatedAxiosInstance();

export const orderApi = {
  createOrder: async (orderData: OrderCreateModel): Promise<number> => {
    try {
      const { data } = await authenticatedAxios.post<number>(
        `${config.apiBaseUrl}/order`,
        orderData
      );
      console.log(data);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании заказа");
    }
  },
  getOrderData: async (productId: number): Promise<OrderGetDataModel> => {
    try {
      const { data } = await authenticatedAxios.get<OrderGetDataModel>(
        `${config.apiBaseUrl}/order?productId=${productId}`
      );
      if (!data) {
        throw new Error("Пустой ответ от сервера");
      }
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении данных заказа"
      );
    }
  },
  confirmOrder: async (orderId: number) => {},
  getSellerOrders: async () => {
    try {
      const { data } = await authenticatedAxios.get<SellerOrdersModel>(
        `${config.apiBaseUrl}/order/seller/54`
      );
      if (!data) {
        throw new Error("Пустой ответ от сервера");
      }
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении заказов продавца"
      );
    }
  },
};
