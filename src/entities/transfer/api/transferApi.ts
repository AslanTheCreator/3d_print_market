import axios, { type AxiosRequestConfig } from "axios";
import { authClient } from "@/shared/api";
import {
  ErrorCodes,
  transformToApiError,
  type BackendErrorResponse,
} from "@/shared/lib/errorHandler";
import type { TransferInput } from "../model/types";
import { Transfer } from "@/shared/types";

const API_URL = "/transfer";

type TransferRequestConfig = AxiosRequestConfig & {
  _skipErrorTransform?: boolean;
};

export const transferApi = {
  getAll: async (): Promise<Transfer[]> => {
    try {
      const { data } = await authClient.get<Transfer[]>(
        API_URL,
        { _skipErrorTransform: true } as TransferRequestConfig,
      );

      return data;
    } catch (error) {
      if (axios.isAxiosError<BackendErrorResponse>(error)) {
        const status = error.response?.status;
        const code = error.response?.data?.code;

        if (status === 404 && code === ErrorCodes.TRANSFER_NOT_FOUND) {
          return [];
        }
      }

      throw transformToApiError(error);
    }
  },

  create: async (input: TransferInput): Promise<void> => {
    await authClient.post(API_URL, input);
  },

  update: async (id: number, input: TransferInput): Promise<Transfer> => {
    const { data } = await authClient.put<Transfer>(`${API_URL}/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await authClient.delete(`${API_URL}/${id}`);
  },
};
