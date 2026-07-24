import {
  OrderCreateModel,
  OrderGetDataModel,
  ListOrdersModel,
  ListOrdersDto,
  OrderCancel,
} from "../model/types";
import { authClient } from "@/shared/api";
import { attachImages } from "@/entities/image/@x/order";
import type { ImageMetadata } from "@/entities/image/@x/order";

const API_URL = `/order`;

type OrderDtoWithImage = ListOrdersDto & { image: ImageMetadata[] };

const attachOrderProductImages = async (
  orders: ListOrdersDto[],
): Promise<ListOrdersModel[]> => {
  const ordersWithImages = await attachImages<ListOrdersDto, OrderDtoWithImage>(
    orders,
    (order) => order.product.imageId,
  );

  return ordersWithImages.map(({ image, ...order }) => ({
    ...order,
    product: {
      ...order.product,
      image,
    },
  }));
};

export const orderApi = {
  // Создание заказа
  createOrder: async (orderData: OrderCreateModel[]) => {
    const { data } = await authClient.post<number[]>(
      `${API_URL}/BOOKED`,
      orderData,
    );
    return data;
  },

  // Подтверждение заказа продавцом
  confirmOrderBySeller: async (orderId: number, comment: string = "") => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/AWAITING_PREPAYMENT?comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Подтверждение предзаказа продавцом
  confirmPreOrderBySeller: async (orderId: number, comment: string = "") => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/AWAITING_PAYMENT?comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Подтверждение предоплаты покупателем
  confirmPrepaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/AWAITING_PREPAYMENT_APPROVAL?imageId=${imageId}&comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Подтверждение оплаты покупателем
  confirmPaymentByCustomer: async (
    orderId: number,
    imageId: number,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/ASSEMBLING?imageId=${imageId}&comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Подтверждение получения заказа покупателем
  confirmReceiptByCustomer: async (orderId: number, comment: string = "") => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/COMPLETED?comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Отправка заказа продавцом
  sendOrderBySeller: async (
    orderId: number,
    deliveryUrl: string,
    comment: string = "",
  ) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderId}/ON_THE_WAY?deliveryUrl=${encodeURIComponent(deliveryUrl)}&comment=${encodeURIComponent(comment)}`,
    );
    return data;
  },

  // Отмена заказа
  cancelOrder: async (orderData: OrderCancel) => {
    const { data } = await authClient.post<number>(
      `${API_URL}/${orderData.orderId}/FAILED`,
      orderData,
    );
    return data;
  },

  // Получение данных для создания заказа
  getOrderData: async (productId: number): Promise<OrderGetDataModel> => {
    const { data } = await authClient.get<OrderGetDataModel>(
      `${API_URL}?productId=${productId}`,
    );
    if (!data) {
      throw new Error("Пустой ответ от сервера");
    }

    return data;
  },

  // Получение заказов продавца
  getSellerOrders: async () => {
    const { data } = await authClient.get<ListOrdersDto[]>(
      `${API_URL}/seller`,
    );
    return attachOrderProductImages(data);
  },

  // Получение заказов покупателя
  getCustomerOrders: async () => {
    const { data } = await authClient.get<ListOrdersDto[]>(
      `${API_URL}/customer`,
    );
    return attachOrderProductImages(data);
  },
  // createDispute: async (
  //   orderId: number,
  //   comment: string,
  //   imageIds: number[],
  // ) => {
  //   const { data } = await authClient.post<number>(
  //     `${API_URL}/orders/${orderId}/DISPUTED?imageIds=${encodeURIComponent(imageIds.join(","))}&comment=${encodeURIComponent(comment)}`,
  //   );
  //   return data;
  // },
  // closeDispute: async (orderId: number, comment: string) => {
  //   const { data } = await authClient.post<number>(
  //     `${API_URL}/orders/${orderId}/DISPUTE_CLOSED?comment=${encodeURIComponent(comment)}`,
  //   );
  //   return data;
  // },
};
