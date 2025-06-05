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
  createOrder: async (orderData: OrderCreateModel) => {
    try {
      await authenticatedAxios.post<number>(
        `${config.apiBaseUrl}/order/BOOKED`,
        orderData
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании заказа");
    }
  },
  confirmOrderBySeller: async (orderId: number, accountId: number) => {
    try {
      await authenticatedAxios.post(
        `${config.apiBaseUrl}/order/${orderId}/AWAITING_PREPAYMENT?accountId=${accountId}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении заказа продавцом"
      );
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
  getSellerOrders: async () => {
    try {
      const { data } = await authenticatedAxios.get<SellerOrdersModel>(
        `${config.apiBaseUrl}/order/seller`
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
