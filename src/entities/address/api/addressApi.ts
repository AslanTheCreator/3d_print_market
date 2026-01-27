import { Address, AddressInput } from "../model/types";
import { authClient } from "@/shared/api";

const API_URL = `/address`;

export const addressApi = {
  createAddress: async (input: AddressInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },
  update: async (id: number, input: AddressInput): Promise<Address> => {
    const { data } = await authClient.put<Address>(`${API_URL}/${id}`, input);
    return data;
  },
  getUserAddresses: async (): Promise<Address[]> => {
    const { data } = await authClient.get<Address[]>(API_URL);
    return data;
  },
  deleteAddress: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
  // пока не нужно
  // getAllRegions: async () => {
  //   try {
  //     const { data } = await authClient.get<string[]>(`${API_URL}/regions`);
  //     return data;
  //   } catch (error) {
  //     throw errorHandler.handleAxiosError(
  //       error,
  //       "Ошибка при загрузке регионов",
  //     );
  //   }
  // },
};
