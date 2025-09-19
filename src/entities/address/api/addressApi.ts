import { AddressBaseModel, AddressCreateModel } from "../model/types";
import { errorHandler } from "@/shared/lib/error-handler";
import { authApi } from "@/shared/api";

const API_URL = `/address`;

export const addressApi = {
  createAddress: async (data: AddressCreateModel) => {
    try {
      await authApi.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании адреса");
    }
  },
  getUserAddresses: async (): Promise<AddressBaseModel[]> => {
    try {
      const { data } = await authApi.get<AddressBaseModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке адресов");
    }
  },
  deleteAddress: async (id: number) => {
    try {
      await authApi.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении адреса");
    }
  },
};
