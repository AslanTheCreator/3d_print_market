import { AddressBaseModel, AddressCreateModel } from "../model/types";
import { errorHandler } from "@/shared/lib";
import { authClient } from "@/shared/api";

const API_URL = `/address`;

export const addressApi = {
  createAddress: async (data: AddressCreateModel) => {
    try {
      await authClient.post(API_URL, data);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при создании адреса");
    }
  },
  getUserAddresses: async (): Promise<AddressBaseModel[]> => {
    try {
      const { data } = await authClient.get<AddressBaseModel[]>(API_URL);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке адресов");
    }
  },
  deleteAddress: async (id: number) => {
    try {
      await authClient.delete(`${API_URL}/${id}`);
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при удалении адреса");
    }
  },
  getAllRegions: async () => {
    try {
      const { data } = await authClient.get<string[]>(`${API_URL}/regions`);
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(
        error,
        "Ошибка при загрузке регионов"
      );
    }
  },
};
