import axios, { type AxiosRequestConfig } from "axios";
import { AccountsBaseModel } from "../model/types";
import { AccountsCreateModel } from "../model/types";
import { authClient } from "@/shared/api";
import {
  ErrorCodes,
  transformToApiError,
  type BackendErrorResponse,
} from "@/shared/lib/errorHandler";

const API_URL = `/accounts`;

type AccountsRequestConfig = AxiosRequestConfig & {
  _skipErrorTransform?: boolean;
};

export const accountsApi = {
  getAll: async (): Promise<AccountsBaseModel[]> => {
    try {
      const { data } = await authClient.get<AccountsBaseModel[]>(
        API_URL,
        { _skipErrorTransform: true } as AccountsRequestConfig,
      );
      return data;
    } catch (error) {
      if (
        axios.isAxiosError<BackendErrorResponse>(error) &&
        error.response?.status === 404 &&
        error.response.data?.code === ErrorCodes.ACCOUNT_NOT_FOUND
      ) {
        return [];
      }

      throw transformToApiError(error);
    }
  },

  getUser: async (id: number): Promise<AccountsBaseModel[]> => {
    const { data } = await authClient.get<AccountsBaseModel[]>(
      `${API_URL}/participant/${id}`,
    );
    return data;
  },

  create: async (data: AccountsCreateModel): Promise<void> => {
    await authClient.post(API_URL, data);
  },

  update: async (
    id: number,
    data: AccountsCreateModel,
  ): Promise<AccountsBaseModel> => {
    const { data: response } = await authClient.put<AccountsBaseModel>(
      `${API_URL}/${id}`,
      data,
    );
    return response;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};
