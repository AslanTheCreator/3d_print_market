import { createAuthenticatedAxiosInstance } from "@/shared/api/axios/authenticatedInstance";
import { AddressBaseModel, AddressCreateModel } from "../model/types";
import { errorHandler } from "@/shared/lib/errorHandler";

import "@/shared/config/axiosInterceptor";

const API_URL = `/address`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const addressApi = {
  createAddress: async (data: AddressCreateModel) => {
    try {
      await authenticatedAxios.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании адреса");
    }
  },
  getUserAddresses: async (): Promise<AddressBaseModel[]> => {
    try {
      const { data } = await authenticatedAxios.get<AddressBaseModel[]>(
        API_URL
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке адресов");
    }
  },
  deleteAddress: async (id: number) => {
    try {
      await authenticatedAxios.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении адреса");
    }
  },
};
