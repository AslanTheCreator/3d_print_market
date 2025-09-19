import { errorHandler } from "@/shared/lib/error-handler";
import {
  OrderCreateModel,
  OrderGetDataModel,
  ListOrdersModel,
} from "../model/types";
import { authApi } from "@/shared/api";

const API_URL = `/order`;

export const orderApi = {
  //1
  createOrder: async (orderData: OrderCreateModel) => {
    try {
      const { data } = await authApi.post<number>(
        `${API_URL}/BOOKED`,
        orderData
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании заказа");
    }
  },
  //2
  confirmOrderBySeller: async (
    orderId: number,
    accountId: number,
    comment: string = ""
  ) => {
    try {
      await authApi.post(
        `${API_URL}/${orderId}/AWAITING_PREPAYMENT?accountId=${accountId}&comment=${encodeURIComponent(
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
  //3.2
  confirmPreOrderBySeller: async (orderId: number, comment: string = "") => {
    try {
      await authApi.post(
        `${API_URL}/${orderId}/AWAITING_PAYMENT?comment=${encodeURIComponent(
          comment
        )}`
      );
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении предзаказа продавцом"
      );
    }
  },
  //3.1
  confirmPrepaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = ""
  ) => {
    try {
      const { data } = await authApi.post<number>(
        `${API_URL}/${orderId}/AWAITING_PREPAYMENT_APPROVAL?imageId=${imageId}&comment=${encodeURIComponent(
          comment
        )}`
      );
      console.log("Покупатель подтвердил предоплату, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении предоплаты покупателем"
      );
    }
  },
  //3.3
  confirmPaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = ""
  ) => {
    try {
      const { data } = await authApi.post<number>(
        `${API_URL}/${orderId}/ASSEMBLING?imageId=${imageId}&comment=${encodeURIComponent(
          comment
        )}`
      );
      console.log("Покупатель подтвердил оплату, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении оплаты заказа покупателем"
      );
    }
  },
  //5
  confirmReceiptByCustomer: async (orderId: number, comment: string = "") => {
    try {
      const { data } = await authApi.post<number>(
        `${API_URL}/${orderId}/COMPLETED?comment=${encodeURIComponent(comment)}`
      );
      console.log("Покупатель подтвердил получение заказа, его id: ", data);
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при подтверждении получения заказа покупателем"
      );
    }
  },
  //4
  sendOrderBySeller: async (
    orderId: number,
    deliveryUrl: string,
    comment: string = ""
  ) => {
    try {
      const { data } = await authApi.post<number>(
        `${API_URL}/${orderId}/ON_THE_WAY?deliveryUrl=${encodeURIComponent(
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
      const { data } = await authApi.get<OrderGetDataModel>(
        `${API_URL}?productId=${productId}`
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
      const { data } = await authApi.get<ListOrdersModel[]>(
        `${API_URL}/seller`
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
      const { data } = await authApi.get<ListOrdersModel[]>(
        `${API_URL}/customer`
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
