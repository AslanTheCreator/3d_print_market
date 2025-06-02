import config from "@/shared/config/api";
import axios from "axios";
import { DictionaryItem } from "./types";
import { errorHandler } from "@/shared/lib/errorHandler";
import { createAuthenticatedAxiosInstance } from "../axios/authenticatedInstance";

const API_URL = `${config.apiBaseUrl}/dictionary`;
const authenticatedAxios = createAuthenticatedAxiosInstance();

export const dictionaryApi = {
  getDictionary: async (type: string): Promise<DictionaryItem[]> => {
    try {
      const { data } = await axios.get<DictionaryItem[]>(
        `${API_URL}?type=${type}`
      );
      return data;
    } catch (error) {
      throw errorHandler.handleAxiosError(error, "Ошибка при загрузке словаря");
    }
  },
};
