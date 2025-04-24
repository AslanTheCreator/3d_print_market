import config from "@/shared/config/api";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { OrderCreateModel } from "../model/types";

export const orderApi = {
  createOrder: async (orderData: OrderCreateModel): Promise<number> => {
    try {
      const authenticatedAxios = createAuthenticatedAxiosInstance();
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
};
