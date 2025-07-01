import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import {
  OrderCreateModel,
  OrderGetDataModel,
  ListOrdersModel,
} from "../model/types";

const authenticatedAxios = createAuthenticatedAxiosInstance();

export const orderApi = {
  createOrder: async (orderData: OrderCreateModel) => {
    try {
      const { data } = await authenticatedAxios.post<number>(
        `${config.apiBaseUrl}/order/BOOKED`,
        orderData
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании заказа");
    }
  },
  confirmOrderBySeller: async (
    orderId: number,
    accountId: number,
    comment: string = ""
  ) => {
    try {
      await authenticatedAxios.post(
        `${
          config.apiBaseUrl
        }/order/${orderId}/AWAITING_PREPAYMENT?accountId=${accountId}&comment=${encodeURIComponent(
          comment
        )}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении заказа продавцом"
      );
    }
  },
  confirmPaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = ""
  ) => {
    try {
      const { data } = await authenticatedAxios.post<number>(
        `${
          config.apiBaseUrl
        }/order/${orderId}/ASSEMBLING?imageId=${imageId}&comment=${encodeURIComponent(
          comment
        )}`
      );
      console.log("Покупатель подтвердил оплату, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении заказа покупателем"
      );
    }
  },
  confirmReceiptByCustomer: async (orderId: number, comment: string = "") => {
    try {
      const { data } = await authenticatedAxios.post<number>(
        `${
          config.apiBaseUrl
        }/order/${orderId}/COMPLETED?comment=${encodeURIComponent(comment)}`
      );
      console.log("Покупатель подтвердил получение заказа, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении получения заказа покупателем"
      );
    }
  },
  sendOrderBySeller: async (
    orderId: number,
    deliveryUrl: string,
    comment: string = ""
  ) => {
    try {
      const { data } = await authenticatedAxios.post<number>(
        `${
          config.apiBaseUrl
        }/order/${orderId}/ON_THE_WAY?deliveryUrl=${encodeURIComponent(
          deliveryUrl
        )}&comment=${encodeURIComponent(comment)}`
      );
      console.log("Продавец отправил заказ, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при отправке заказа продавцом"
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
  getSellerOrders: async (): Promise<ListOrdersModel[]> => {
    try {
      const { data } = await authenticatedAxios.get<ListOrdersModel[]>(
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
  getCustomerOrders: async (): Promise<ListOrdersModel[]> => {
    try {
      const { data } = await authenticatedAxios.get<ListOrdersModel[]>(
        `${config.apiBaseUrl}/order/customer`
      );
      if (!data) {
        throw new Error("Пустой ответ от сервера");
      }
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при получении заказов покупателя"
      );
    }
  },
};
