import {
  OrderCreateModel,
  OrderGetDataModel,
  ListOrdersModel,
} from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/order`;

export const orderApi = {
  //1
  createOrder: async (orderData: OrderCreateModel[]) => {
    const { data } = await authClient.post<number[]>(
      `${API_URL}/BOOKED`,
      orderData,
    );
    return data;
  },
  //2
  confirmOrderBySeller: async (
    orderId: number,
    accountId: number,
    comment: string = "",
  ) => {
    await authClient.post(
      `${API_URL}/${orderId}/AWAITING_PREPAYMENT?accountId=${accountId}&comment=${encodeURIComponent(
        comment,
      )}`,
    );
  },
  //3.2
  confirmPreOrderBySeller: async (orderId: number, comment: string = "") => {
    await authClient.post(
      `${API_URL}/${orderId}/AWAITING_PAYMENT?comment=${encodeURIComponent(
        comment,
      )}`,
    );
  },
  //3.1
  confirmPrepaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/AWAITING_PREPAYMENT_APPROVAL?imageId=${imageId}&comment=${encodeURIComponent(
        comment,
      )}`,
    );
  },
  //3.3
  confirmPaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/ASSEMBLING?imageId=${imageId}&comment=${encodeURIComponent(
        comment,
      )}`,
    );
  },
  //5
  confirmReceiptByCustomer: async (orderId: number, comment: string = "") => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/COMPLETED?comment=${encodeURIComponent(comment)}`,
    );
  },
  //4
  sendOrderBySeller: async (
    orderId: number,
    deliveryUrl: string,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/ON_THE_WAY?deliveryUrl=${encodeURIComponent(
        deliveryUrl,
      )}&comment=${encodeURIComponent(comment)}`,
    );
  },
  getOrderData: async (productId: number): Promise<OrderGetDataModel> => {
    const { data } = await authClient.get<OrderGetDataModel>(
      `${API_URL}?productId=${productId}`,
    );
    if (!data) {
      throw new Error("Пустой ответ от сервера");
    }

    return data;
  },
  getSellerOrders: async (): Promise<ListOrdersModel[]> => {
    const { data } = await authClient.get<ListOrdersModel[]>(
      `${API_URL}/seller`,
    );
    if (!data) {
      throw new Error("Пустой ответ от сервера");
    }
    return data;
  },
  getCustomerOrders: async (): Promise<ListOrdersModel[]> => {
    const { data } = await authClient.get<ListOrdersModel[]>(
      `${API_URL}/customer`,
    );
    if (!data) {
      throw new Error("Пустой ответ от сервера");
    }
    return data;
  },
};
